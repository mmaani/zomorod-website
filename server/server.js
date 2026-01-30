import express from "express";
import dotenv from "dotenv";
import busboy from "busboy";
import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MAX_FILE_BYTES = Number(process.env.MAX_CV_BYTES || 10 * 1024 * 1024); // 10MB
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1";

const TOKEN_PATH = path.resolve(".secrets/google-oauth-token.json");

// -------------------- OAuth helpers --------------------
function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI in .env");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const raw = fs.readFileSync(TOKEN_PATH, "utf8");
  return JSON.parse(raw);
}

function saveToken(token) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf8");
}

function getGoogleClientsOrThrow() {
  const oauth2Client = getOAuthClient();
  const token = loadToken();

  if (!token) {
    throw new Error("Not authenticated. Visit /auth/google to connect your Google account.");
  }

  oauth2Client.setCredentials(token);

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

// -------------------- OAuth routes --------------------

// Step A: start OAuth
app.get("/auth/google", (req, res) => {
  const oauth2Client = getOAuthClient();

  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // IMPORTANT: gives refresh_token (first time)
    prompt: "consent",      // ensures refresh_token is returned
    scope: scopes,
  });

  res.redirect(url);
});

// Step B: OAuth callback
app.get("/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(String(code));

    // Save token to disk (local dev)
    saveToken(tokens);

    res.send("✅ Google connected successfully. You can now POST /api/recruitment/apply");
  } catch (err) {
    res.status(500).send(err?.message || String(err));
  }
});

// Optional: check auth status
app.get("/auth/status", async (req, res) => {
  try {
    const token = loadToken();
    return res.json({ ok: true, hasToken: !!token });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// -------------------- Drive upload --------------------
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

// -------------------- Sheets append --------------------
async function appendToSheet({ sheets, spreadsheetId, row }) {
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID in .env");

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

// -------------------- Recruitment apply handler --------------------
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
      const required = ["first_name", "last_name", "email", "education", "country", "city"];
      const missing = required.filter((k) => !fields[k] || !String(fields[k]).trim());
      if (missing.length) return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });

      if (!fileBuffer || !fileInfo) return res.status(400).json({ ok: false, error: "Missing cv file field (cv=@file)" });
      if (totalBytes > MAX_FILE_BYTES) return res.status(413).json({ ok: false, error: `CV too large. Max is ${MAX_FILE_BYTES} bytes` });

      // Must be authenticated first
      const { drive, sheets } = getGoogleClientsOrThrow();

      // Upload
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const safeName = sanitizeFilename(`${fields.first_name}_${fields.last_name}_${Date.now()}_${fileInfo.filename || "cv"}`);

      const driveUpload = await uploadToDrive({
        drive,
        folderId,
        buffer: fileBuffer,
        filename: safeName,
        mimeType: fileInfo.mimeType,
      });

      // Append sheet
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

      return res.json({
        ok: true,
        saved: true,
        drive: driveUpload,
      });
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

// Routes
app.post("/api/recruitment/apply", applyHandler);

app.get("/api/test-oauth", (req, res) => {
  try {
    const token = loadToken();
    return res.json({ ok: true, hasToken: !!token });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
