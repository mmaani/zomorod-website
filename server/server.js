import { googleOAuthStart, googleOAuthCallback } from "./routesGoogleOAuth.js";
import express from "express";
import busboy from "busboy";
import { google } from "googleapis";
import { Readable } from "stream";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import recruitmentHandler from "./recruitment.js";
import loginHandler from "../api/login.js";
import { googleOAuthManual } from "./routesGoogleOAuthManual.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ---- paths (must be before dotenv.config) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, ".."); // repo root

// ---- load .env explicitly from repo root ----
dotenv.config({ path: path.join(ROOT_DIR, ".env") });

// ---- crash visibility (avoid silent 502) ----
process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("🔥 unhandledRejection:", err);
});
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
    // Sanity check: folder exists + accessible
    await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const fileStream = Readable.from(buffer);
console.log("Drive upload using access token prefix:", String(accessToken).slice(0, 12));

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

  console.log(
    "➡️ Sheets: appending into sheetId =",
    spreadsheetId,
    "range =",
    SHEET_RANGE
  );

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

  // Cookies must work in Codespaces tunnel:
  // - secure true
  // - SameSite None
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    // ✅ IMPORTANT: include openid/email/profile so we can read email
    scope: [
      "openid",
      "email",
      "profile",
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

    // ✅ set credentials so we can call userinfo now
    oauth2Client.setCredentials(tokens);

    // ✅ fetch email immediately (this is what you asked for)
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const me = await oauth2.userinfo.get();

    // Store tokens cookie
    res.cookie("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.type("text").send(
      `✅ Google connected successfully.\n\nAuthorized email: ${me?.data?.email}\n\nNow open /test-upload.html and submit a file.\nIf Drive/Sheet fails, share the Drive folder & Sheet to that email.`
    );
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

// Verify which Google user you authorized
app.get("/auth/whoami", async (req, res) => {
  try {
    const { auth } = getGoogleClientsFromRequestOrThrow(req);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const me = await oauth2.userinfo.get();

    return res.json({
      ok: true,
      email: me.data.email,
      name: me.data.name,
      id: me.data.id,
    });
  } catch (err) {
    console.error("🔥 /auth/whoami failed:", err?.response?.data || err);
    return res
      .status(401)
      .json({ ok: false, error: err?.message || String(err) });
  }
});

// Logout (clear cookies)
app.get("/auth/logout", (_req, res) => {
  res.clearCookie("google_tokens", { path: "/" });
  res.clearCookie("oauth_state", { path: "/" });
  return res.type("text").send("Logged out. Now open /auth/google again.");
});
app.get("/api/google/oauth/manual", googleOAuthManual);
app.get("/api/google/oauth/start", googleOAuthStart);
app.get("/api/google/oauth/callback", googleOAuthCallback);


// Recruitment upload endpoint
// CRM login route bridged from serverless handler for single-backend local/dev usage
app.post("/api/login", loginHandler);

// Recruitment endpoint (implemented in server/recruitment.js)
app.all("/api/recruitment", recruitmentHandler);

// Legacy endpoint kept for backward compatibility.
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
          return res
            .status(400)
            .json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });
        }

        if (!fileBuffer || !fileInfo) {
          return res.status(400).json({ ok: false, error: "Missing cv file field (cv=@file)" });
        }

        if (totalBytes > MAX_FILE_BYTES) {
          return res
            .status(413)
            .json({ ok: false, error: `CV too large. Max is ${MAX_FILE_BYTES} bytes` });
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
  console.log(
    `Codespace URL: https://${process.env.CODESPACE_NAME || "<CODESPACE_NAME>"}-${PORT}.app.github.dev`
  );
});
