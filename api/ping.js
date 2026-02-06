function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export const config = { runtime: "nodejs" };

// Simple ping endpoint: returns a JSON response to indicate the API is healthy.
export default async function handler(_req, res) {
  return send(res, 200, { ok: true, message: "pong" });
}