function mustEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function googleOAuthManual(req, res) {
  try {
    const code = String(req.query?.code || "").trim();
    if (!code) {
      return res
        .status(200)
        .type("text/plain")
        .send(
`Step 1) Open this Google consent URL in YOUR browser (copy/paste):
(you will sign in and approve)

Step 2) After approval, Google will redirect to a callback URL that may fail (because Codespaces tunnel is 502).
Copy the full redirected URL from the browser address bar and extract the "code=..." value.

Step 3) Paste that code here like:
  /api/google/oauth/manual?code=PASTE_CODE

Then you'll get the refresh token to put in .env.`
        );
    }

    const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = mustEnv("GOOGLE_OAUTH_REDIRECT_URI");

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
      return res.status(500).json({ ok: false, error: "Token exchange failed", detail: data });
    }

    const refresh = data.refresh_token || "";
    if (!refresh) {
      return res
        .status(200)
        .type("text/plain")
        .send(
`No refresh_token returned.

Fix:
1) Google Account -> Security -> Third-party access -> remove this app
2) Try consent again with prompt=consent

Token response:
${JSON.stringify(data, null, 2)}`
        );
    }

    return res
      .status(200)
      .type("text/plain")
      .send(`GOOGLE_OAUTH_REFRESH_TOKEN=${refresh}\n`);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
