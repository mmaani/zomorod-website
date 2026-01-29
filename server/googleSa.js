// server/googleSa.js
export function getServiceAccountFromEnv() {
  const b64 = process.env.GOOGLE_SA_B64;
  if (!b64) throw new Error("Missing GOOGLE_SA_B64 env var");

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const sa = JSON.parse(jsonStr);

  // Fix private_key if it contains literal "\\n"
  if (sa.private_key && sa.private_key.includes("\\n")) {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }

  // Basic sanity checks
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("Service account JSON missing required fields");
  }

  return sa;
}
