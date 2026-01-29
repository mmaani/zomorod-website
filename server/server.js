import express from "express";
import dotenv from "dotenv";

dotenv.config(); // loads .env (if you use it)

const app = express();
app.use(express.json());

app.get("/api/test-sa", (req, res) => {
  try {
    const b64 = process.env.GOOGLE_SA_B64;
    if (!b64) {
      return res.status(500).json({ ok: false, error: "Missing GOOGLE_SA_B64 env var" });
    }

    const jsonStr = Buffer.from(b64, "base64").toString("utf8");

console.log("DEBUG b64 length:", b64.length);
console.log("DEBUG jsonStr first 120:", JSON.stringify(jsonStr.slice(0, 120)));
console.log("DEBUG jsonStr last 80:", JSON.stringify(jsonStr.slice(-80)));

const sa = JSON.parse(jsonStr);


    // Return only SAFE fields (never return private_key)
    return res.json({
      ok: true,
      project_id: sa.project_id,
      client_email: sa.client_email,
      private_key_present: !!sa.private_key
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err)
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
