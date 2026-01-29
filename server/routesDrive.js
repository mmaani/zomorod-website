import express from "express";
import { google } from "googleapis";
import { getGoogleAuth } from "./googleClient.js";

const router = express.Router();

// GET /api/drive/list?folderId=...
router.get("/list", async (req, res) => {
  try {
    const { folderId } = req.query;
    if (!folderId) return res.status(400).json({ ok: false, error: "Missing folderId" });

    const auth = getGoogleAuth(["https://www.googleapis.com/auth/drive.readonly"]);
    const drive = google.drive({ version: "v3", auth });

    const r = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id,name,mimeType,modifiedTime,size)",
      pageSize: 50,
    });

    return res.json({ ok: true, files: r.data.files || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// POST /api/drive/upload-text
// body: { "folderId":"...", "name":"test.txt", "content":"hello" }
router.post("/upload-text", async (req, res) => {
  try {
    const { folderId, name, content } = req.body;
    if (!folderId || !name || typeof content !== "string") {
      return res.status(400).json({ ok: false, error: "Missing folderId, name, or content" });
    }

    const auth = getGoogleAuth(["https://www.googleapis.com/auth/drive"]);
    const drive = google.drive({ version: "v3", auth });

    const r = await drive.files.create({
      requestBody: {
        name,
        parents: [folderId],
      },
      media: {
        mimeType: "text/plain",
        body: content,
      },
      fields: "id,name,webViewLink",
    });

    return res.json({ ok: true, file: r.data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
