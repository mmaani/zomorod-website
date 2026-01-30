import express from "express";
import dotenv from "dotenv";
import busboy from "busboy";
import { google } from "googleapis";
import { Readable } from "stream";

dotenv.config();

const app = express();
app.use(express.json());

// -------------------- Config --------------------
const PORT = process.env.PORT || 3000;
const MAX_FILE_BYTES = Number(process.env.MAX_CV_BYTES || 10 * 1024 * 1024); // 10MB default
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A1";

// -------------------- Google Auth (Service Account via base64 env) --------------------
function getServiceAccountFromEnv() {
  const b64 = process.env.GOOGLE_SA_B64;
  if (!b64) throw new Error("Missing GOOGLE_SA_B64 env var");

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(jsonStr);
}

function getGoogleClients() {
  const sa = getServiceAccountFromEnv();

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [
      // Least privilege:
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
  };
}

// -------------------- Helpers --------------------
function sanitizeFilename(name) {
  // Replace spaces + risky characters
  return String(name)
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 180);
}

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
    requestBody: {
      values: [row],
    },
  });
}

// -------------------- Recruitment apply handler --------------------
async function applyHandler(req, res) {
  try {
    const bb = busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_FILE_BYTES,
      },
    });

    const fields = {};
    let fileInfo = null;
    let fileBuffer = null;
    let totalBytes = 0;

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;

      if (name !== "cv") {
        file.resume();
        return;
      }

      fileInfo = { filename, mimeType };
      const chunks = [];

      file.on("data", (chunk) => {
        totalBytes += chunk.length;
        chunks.push(chunk);
      });

      file.on("limit", () => {
        // busboy will stop reading further; we handle response in finish/error
      });

      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("error", (err) => {
      return res.status(400).json({ ok: false, error: err?.message || String(err) });
    });

    bb.on("finish", async () => {
      // Validate required fields
      const required = ["first_name", "last_name", "email", "education", "country", "city"];
      const missing = required.filter((k) => !fields[k] || !String(fields[k]).trim());

      if (missing.length) {
        return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });
      }

      // Validate file
      if (!fileBuffer || !fileInfo) {
        return res.status(400).json({ ok: false, error: "Missing cv file field (cv=@file)" });
      }

      if (totalBytes > MAX_FILE_BYTES) {
        return res.status(413).json({
          ok: false,
          error: `CV too large. Max allowed is ${MAX_FILE_BYTES} bytes.`,
        });
      }

      // Build safe filename
      const safeName = sanitizeFilename(
        `${fields.first_name}_${fields.last_name}_${Date.now()}_${fileInfo.filename || "cv"}`
      );

      // Google clients
      const { drive, sheets } = getGoogleClients();

      // 1) Upload CV to Drive
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      const driveUpload = await uploadToDrive({
        drive,
        folderId,
        buffer: fileBuffer,
        filename: safeName,
        mimeType: fileInfo.mimeType || "application/octet-stream",
      });

      // 2) Append row to Sheet
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
        drive: {
          fileId: driveUpload.fileId,
          webViewLink: driveUpload.webViewLink,
        },
      });
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

// -------------------- Routes --------------------
app.post("/api/recruitment/apply", applyHandler);

app.get("/api/test-sa", (req, res) => {
  try {
    const sa = getServiceAccountFromEnv();
    return res.json({
      ok: true,
      project_id: sa.project_id,
      client_email: sa.client_email,
      private_key_present: !!sa.private_key,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// -------------------- Start server --------------------
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
