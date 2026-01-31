import express from "express";
import dotenv from "dotenv";
import busboy from "busboy";
import { google } from "googleapis";
import { Readable } from "stream";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();
process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 unhandledRejection:", err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, ".."); // repo root (one level above /server)

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.use(cookieParser(process.env.COOKIE_SECRET || "dev_cookie_secret"));

// Log all requests (put BEFORE routes)
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});
const secure = true; // for app.github.dev always https
res.cookie("google_tokens", JSON.stringify(tokens), {
  httpOnly: true,
  secure,
  sameSite: "none",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 30,
});

// ---------- Config ----------
const PORT = Number(process.env.PORT || 3001);
const MAX_FILE_BYTES = Number(process.env.MAX_CV_BYTES || 10 * 1024 * 1024); // 10MB default
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1";

// Root route
app.get("/", (req, res) => {
  res
    .type("text")
    .send("API is running. Try /auth/status then /auth/google");
});

// ---------- OAuth client ----------
function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI in .env"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getGoogleClientsFromRequestOrThrow(req) {
  const raw = req.cookies?.google_tokens;
  if (!raw) {
    throw new Error("Google not connected. Visit /auth/google first.");
  }

  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    throw new Error("Invalid google_tokens cookie. Reconnect at /auth/google.");
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  return {
    auth: oauth2Client,
    drive: google.drive({ version: "v3", auth: oauth2Client }),
    sheets: google.sheets({ version: "v4", auth: oauth2Client }),
  };
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 180);
}

// Helper: detect HTTPS behind proxy/tunnel
function isHttpsRequest(req) {
  const xfProto = req.headers["x-forwarded-proto"];
  return xfProto === "https" || req.secure === true;
}

// ---------- OAuth routes ----------
app.get("/auth/google", (req, res) => {
  const oauth2Client = getOAuthClient();

  const state = crypto.randomBytes(16).toString("hex");

  const secure = isHttpsRequest(req);

 res.cookie("oauth_state", state, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
});

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    state,
  });

  return res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const expectedState = req.cookies?.oauth_state;
    const gotState = req.query?.state;

    if (!expectedState || !gotState || expectedState !== gotState) {
      return res.status(400).send("Invalid state. Please retry /auth/google");
    }

    const code = req.query?.code;
    if (!code) return res.status(400).send("Missing code");

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(String(code));

    const secure = isHttpsRequest(req);

    res.cookie("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      sameSite: secure ? "none" : "lax",
      secure,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.send("✅ Google connected successfully. You can now POST /api/recruitment/apply");
  } catch (err) {
    return res.status(500).send(err?.message || String(err));
  }
});

app.get("/auth/status", (req, res) => {
  const connected = !!req.cookies?.google_tokens;
  return res.json({ ok: true, connected });
});

// ---------- Drive upload ----------
async function uploadToDrive({ drive, folderId, buffer, filename, mimeType }) {
  if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in .env");

  const fileStream = Readable.from(buffer);

  const createRes = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: fileStream,
    },
    fields: "id, webViewLink",
  });

  const fileId = createRes.data.id;
  const webViewLink =
    createRes.data.webViewLink || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null);

  return { fileId, webViewLink };
}

// ---------- Sheets append ----------
async function appendToSheet({ sheets, spreadsheetId, row }) {
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID in .env");

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

// ---------- Recruitment apply handler ----------
async function applyHandler(req, res) {
  try {
    const bb = busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_FILE_BYTES },
    });

    const fields = {};
    let fileInfo = null;
    let fileBuffer = null;
    let totalBytes = 0;

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      if (name !== "cv") {
        file.resume();
        return;
      }

      const { filename, mimeType } = info;
      fileInfo = { filename, mimeType };

      const chunks = [];
      file.on("data", (chunk) => {
        totalBytes += chunk.length;
        chunks.push(chunk);
      });
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("error", (err) => {
      return res.status(400).json({ ok: false, error: err?.message || String(err) });
    });

    bb.on("finish", async () => {
  try {
    // validate fields...
    // getGoogleClients...
    // uploadToDrive...
    // appendToSheet...

    return res.json({ ok: true, saved: true, drive: driveUpload });
  } catch (err) {
    console.error("🔥 /api/recruitment/apply failed:", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});
     
      if (!fileBuffer || !fileInfo) {
        return res.status(400).json({ ok: false, error: "Missing cv file field (cv=@file)" });
      }

      if (totalBytes > MAX_FILE_BYTES) {
        return res.status(413).json({ ok: false, error: `CV too large. Max is ${MAX_FILE_BYTES} bytes` });
      }

      let drive, sheets;
      try {
        ({ drive, sheets } = getGoogleClientsFromRequestOrThrow(req));
      } catch (e) {
        return res.status(401).json({ ok: false, error: e?.message || String(e) });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const safeName = sanitizeFilename(
        `${fields.first_name}_${fields.last_name}_${Date.now()}_${fileInfo.filename || "cv"}`
      );

      const driveUpload = await uploadToDrive({
        drive,
        folderId,
        buffer: fileBuffer,
        filename: safeName,
        mimeType: fileInfo.mimeType,
      });

      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const now = new Date().toISOString();

      const row = [
        now,
        fields.first_name,
        fields.last_name,
        fields.email,
        fields.education,
        fields.country,
        fields.city,
        driveUpload.webViewLink,
        driveUpload.fileId,
      ];

      await appendToSheet({ sheets, spreadsheetId, row });

      return res.json({ ok: true, saved: true, drive: driveUpload });
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

// ---------- Routes ----------
app.post("/api/recruitment/apply", applyHandler);

app.get("/api/test-oauth", (req, res) => {
  const connected = !!req.cookies?.google_tokens;
  return res.json({ ok: true, connected });
});

app.get("/test-upload.html", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "test-upload.html"));
});



// ---------- Start ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
