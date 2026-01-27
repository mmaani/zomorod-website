export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getBearerToken(request) {
  const h = request.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
