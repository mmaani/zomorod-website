import express from "express";
import dotenv from "dotenv";

dotenv.config(); // loads .env (if you use it)

const app = express();
app.use(express.json());

app.get("/api/test-sa", (req, res) => {
  try {
    const b64 = process.env.GOOGLE_SA_B64;

    if (!b64) {
      return res.status(500).json({
        ok: false,
        error: "Missing GOOGLE_SA_B64 env var",
      });
    }

    const jsonStr = Buffer.from(b64, "base64").toString("utf8");

    // Try parsing. If it fails, return debug slices in the RESPONSE
    // (Do NOT keep this in production)
    let sa;
    try {
      sa = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: String(e?.message || e),
        debug: {
          b64_length: b64.length,
          first_120: jsonStr.slice(0, 120),
          last_80: jsonStr.slice(-80),
        },
      });
    }

    // Return only SAFE fields (never return private_key)
    return res.json({
      ok: true,
      project_id: sa.project_id,
      client_email: sa.client_email,
      private_key_present: !!sa.private_key,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
