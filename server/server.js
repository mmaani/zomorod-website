import express from "express";
import dotenv from "dotenv";
import busboy from "busboy";

dotenv.config();

const app = express();
app.use(express.json());

/**
 * Recruitment apply handler (multipart/form-data)
 * Expects fields:
 * - first_name, last_name, email, education, country, city
 * - cv (file)
 */
async function applyHandler(req, res) {
  try {
    const bb = busboy({ headers: req.headers });

    const fields = {};
    let fileInfo = null;
    let fileBuffer = null;

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;

      if (name !== "cv") {
        // ignore any unexpected files
        file.resume();
        return;
      }

      fileInfo = { filename, mimeType };
      const chunks = [];

      file.on("data", (d) => chunks.push(d));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("error", (err) => {
      throw err;
    });

    bb.on("finish", async () => {
      // basic validation
      const required = ["first_name", "last_name", "email", "education", "country", "city"];
      const missing = required.filter((k) => !fields[k] || !fields[k].trim());

      if (missing.length) {
        return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(", ")}` });
      }
      if (!fileBuffer || !fileInfo) {
        return res.status(400).json({ ok: false, error: "Missing cv file field (cv=...)" });
      }

      // For now just return success + debug info (safe)
      return res.json({
        ok: true,
        received: {
          ...fields,
          cv: {
            filename: fileInfo.filename,
            mimeType: fileInfo.mimeType,
            sizeBytes: fileBuffer.length,
          },
        },
      });
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

// ✅ Define routes AFTER app initialization
app.post("/api/recruitment/apply", applyHandler);

// Keep your SA test route if you want
app.get("/api/test-sa", (req, res) => {
  try {
    const b64 = process.env.GOOGLE_SA_B64;
    if (!b64) return res.status(500).json({ ok: false, error: "Missing GOOGLE_SA_B64 env var" });

    const jsonStr = Buffer.from(b64, "base64").toString("utf8");
    const sa = JSON.parse(jsonStr);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
