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

// ---- crash visibility (avoid silent 502) ----
process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("🔥 unhandledRejection:", err);
});

// ---- paths ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, ".."); // repo root

// ---- app ----
const app = express();

// required for Codespaces tunnel so req.secure + x-forwarded-proto behaves
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || "dev_cookie_secret"));

// Log all requests (before routes)
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// ---- config ----
const PORT = Number(process.env.PORT || 3001);
const MAX_FILE_BYTES = Number(process.env.MAX_CV_BYTES || 10 * 1024 * 1024);
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1";

// ---- helpers ----
function sanitizeFilename(name) {
  return String(name)
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 180);
}

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
  if (!raw) throw new Error("Google not connected. Visit /auth/google first.");

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

function logGoogleError(prefix, err) {
  const data = err?.response?.data;
  if (data) console.error(prefix, JSON.stringify(data, null, 2));
  else console.error(prefix, err);
}

// ---- Drive upload ----
async function uploadToDrive({ drive, folderId, buffer, filename, mimeType }) {
  if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in .env");

  console.log("➡️ Drive: uploading into folderId =", folderId);

  try {
    // QUICK sanity check: folder exists + you have access
    await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

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
      supportsAllDrives: true,
    });

    const fileId = createRes.data.id;
    const webViewLink =
      createRes.data.webViewLink ||
      (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null);

    console.log("✅ Drive: uploaded fileId =", fileId);
    return { fileId, webViewLink };
  } catch (err) {
    logGoogleError("🔥 Drive error:", err);
    throw err;
  }
}

// ---- Sheets append ----
async function appendToSheet({ sheets, spreadsheetId, row }) {
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID in .env");

  console.log("➡️ Sheets: appending into sheetId =", spreadsheetId, "range =", SHEET_RANGE);

  try {
    // sanity check: sheet exists + accessible
    await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetId,properties.title",
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: SHEET_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    console.log("✅ Sheets: appended row");
  } catch (err) {
    logGoogleError("🔥 Sheets error:", err);
    throw err;
  }
}

// ---- routes ----

// Root health
app.get("/", (_req, res) => {
  res.type("text").send("API is running. Try /auth/status then /auth/google");
});

// Serve test form
app.get("/test-upload.html", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "test-upload.html"));
});

// OAuth start
app.get("/auth/google", (_req, res) => {
  const oauth2Client = getOAuthClient();
  const state = crypto.randomBytes(16).toString("hex");

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

// OAuth callback
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

    res.cookie("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.type("text").send("✅ Google connected successfully. Now submit /test-upload.html");
  } catch (err) {
    console.error("🔥 /auth/google/callback failed:", err?.response?.data || err);
    return res.status(500).send(err?.message || String(err));
  }
});

// OAuth status
app.get("/auth/status", (req, res) => {
  const connected = !!req.cookies?.google_tokens;
  return res.json({ ok: true, connected });
});

// Optional: verify which Google user you authorized (helps debugging)
app.get("/auth/whoami", async (req, res) => {
  try {
    const { auth } = getGoogleClientsFromRequestOrThrow(req);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const me = await oauth2.userinfo.get();
    res.json({ ok: true, email: me?.data?.email, name: me?.data?.name });
  } catch (err) {
    return res.status(401).json({ ok: false, error: err?.message || String(err) });
  }
});

// Recruitment upload endpoint
app.post("/api/recruitment/apply", async (req, res) => {
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
      console.error("🔥 busboy error:", err);
      return res.status(400).json({ ok: false, error: err?.message || String(err) });
    });

    bb.on("finish", async () => {
      try {
        const required = ["first_name", "last_name", "email", "education", "country", "city"];
        const missing = required.filter((k) => !fields[k] || !String(fields[k]).trim());
        if (missing.length) {
          return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });
        }

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
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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
      } catch (err) {
        console.error("🔥 /api/recruitment/apply failed:", err?.response?.data || err);
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error("🔥 /api/recruitment/apply outer failed:", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// ---- start ----
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Codespace URL: https://${process.env.CODESPACE_NAME || "<CODESPACE_NAME>"}-${PORT}.app.github.dev`);
});
