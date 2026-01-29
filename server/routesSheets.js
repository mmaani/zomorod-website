import express from "express";
import { google } from "googleapis";
import { getGoogleAuth } from "./googleClient.js";

const router = express.Router();

// GET /api/sheets/read?spreadsheetId=...&range=Sheet1!A1:D20
router.get("/read", async (req, res) => {
  try {
    const { spreadsheetId, range } = req.query;
    if (!spreadsheetId || !range) {
      return res.status(400).json({ ok: false, error: "Missing spreadsheetId or range" });
    }

    const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const sheets = google.sheets({ version: "v4", auth });

    const r = await sheets.spreadsheets.values.get({ spreadsheetId, range });

    return res.json({ ok: true, values: r.data.values || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// POST /api/sheets/append
// body: { "spreadsheetId":"...", "range":"Sheet1!A:D", "values":[["a","b","c","d"]] }
router.post("/append", async (req, res) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !Array.isArray(values)) {
      return res.status(400).json({ ok: false, error: "Missing spreadsheetId, range, or values[]" });
    }

    const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]);
    const sheets = google.sheets({ version: "v4", auth });

    const r = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    return res.json({ ok: true, updates: r.data.updates });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
