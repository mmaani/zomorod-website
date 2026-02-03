export function getGoogleServiceAccount() {
  const b64 = process.env.GOOGLE_SA_B64;
  if (!b64) throw new Error("Missing GOOGLE_SA_B64 env var");

  const json = Buffer.from(b64, "base64").toString("utf8");
  const sa = JSON.parse(json);

  // Normalize private_key (sometimes needed)
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");

  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("Invalid service account JSON in GOOGLE_SA_B64");
  }

  return sa;
}
