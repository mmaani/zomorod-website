function sendHtml(res, html, status = 200) {
  res.status(status).set("Content-Type", "text/html; charset=utf-8").send(html);
}
function sendJson(res, status, payload) {
  res.status(status).json(payload);
}
function mustEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function googleOAuthStart(req, res) {
  try {
    const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
    const redirectUri = mustEnv("GOOGLE_OAUTH_REDIRECT_URI");

    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ];

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", scopes.join(" "));

    return res.redirect(302, url.toString());
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: String(e?.message || e) });
  }
}

export async function googleOAuthCallback(req, res) {
  try {
    const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = mustEnv("GOOGLE_OAUTH_REDIRECT_URI");

    const code = String(req.query?.code || "");
    if (!code) return sendHtml(res, "<h3>Missing code</h3>", 400);

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok) {
      return sendHtml(
        res,
        `<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`,
        500
      );
    }

    const refresh = data.refresh_token || "";
    if (!refresh) {
      return sendHtml(
        res,
        `<h3>No refresh_token returned.</h3>
<p>This usually means you already approved this app before.</p>
<p>Fix: Google Account → Security → Third-party access → remove the app, then try again.</p>
<pre>${JSON.stringify(data, null, 2)}</pre>`,
        200
      );
    }

    return sendHtml(
      res,
      `<h3>Success ✅</h3>
<p>Add this to your <code>.env</code> then restart the server:</p>
<pre>GOOGLE_OAUTH_REFRESH_TOKEN=${refresh}</pre>`,
      200
    );
  } catch (e) {
    return sendHtml(res, `<pre>${String(e?.message || e)}</pre>`, 500);
  }
}