// Simple ping endpoint: returns a JSON response to indicate the API is healthy.
export default {
  fetch() {
    return Response.json({ ok: true, message: 'pong' });
  }
};
