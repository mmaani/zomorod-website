// api/contact.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const LIMITS = {
  perSecond: 2, // Resend default API rate limit
  daily: 100, // Free plan daily quota
  monthly: 3000, // Free plan monthly quota
};

function getLimiterState() {
  if (!globalThis.__zms_email_limit) {
    globalThis.__zms_email_limit = {
      dailyCount: 0,
      dailyStart: Date.now(),
      monthKey: new Date().toISOString().slice(0, 7), // YYYY-MM
      monthlyCount: 0,
      perSecond: new Map(),
    };
  }
  return globalThis.__zms_email_limit;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.end(JSON.stringify(payload));
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readJson(req) {
  const body = req.body;

  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  if (body && typeof body === "object") return body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function isValidEmail(email) {
  const s = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getClientIp(req) {
  const xf = req.headers?.["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimits(req) {
  const now = Date.now();
  const state = getLimiterState();

  // Reset daily window (24h rolling from first use)
  if (now - state.dailyStart >= 24 * 60 * 60 * 1000) {
    state.dailyStart = now;
    state.dailyCount = 0;
  }

  // Reset monthly window on month change
  const monthKey = new Date().toISOString().slice(0, 7);
  if (state.monthKey !== monthKey) {
    state.monthKey = monthKey;
    state.monthlyCount = 0;
  }

  // Per-second per-IP limit
  const ip = getClientIp(req);
  const entry = state.perSecond.get(ip) || { ts: now, count: 0 };
  if (now - entry.ts >= 1000) {
    entry.ts = now;
    entry.count = 0;
  }
  if (entry.count >= LIMITS.perSecond) {
    return {
      ok: false,
      status: 429,
      error: "Rate limit exceeded (per-second)",
      retryAfter: 1,
    };
  }

  if (state.dailyCount >= LIMITS.daily) {
    const retryAfter = Math.ceil((state.dailyStart + 24 * 60 * 60 * 1000 - now) / 1000);
    return {
      ok: false,
      status: 429,
      error: "Daily email quota exceeded",
      retryAfter: Math.max(retryAfter, 1),
    };
  }

  if (state.monthlyCount >= LIMITS.monthly) {
    return {
      ok: false,
      status: 429,
      error: "Monthly email quota exceeded",
      retryAfter: 3600,
    };
  }

  // Consume
  entry.count += 1;
  state.perSecond.set(ip, entry);
  state.dailyCount += 1;
  state.monthlyCount += 1;

  return { ok: true };
}

export default async function handler(req, res) {
  if ((req.method || "").toUpperCase() !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const rl = checkRateLimits(req);
    if (!rl.ok) {
      if (rl.retryAfter) res.setHeader("Retry-After", String(rl.retryAfter));
      return send(res, rl.status, { ok: false, error: rl.error });
    }

    const fromEmail = String(process.env.CRM_FROM_EMAIL || "").trim();
    if (!process.env.RESEND_API_KEY || !fromEmail) {
      return send(res, 500, {
        ok: false,
        error: "Email service is not configured",
      });
    }

    const body = await readJson(req);
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const message = String(body?.message || "").trim();

    if (!name || !email || !message) {
      return send(res, 400, { ok: false, error: "Missing required fields" });
    }
    if (!isValidEmail(email)) {
      return send(res, 400, { ok: false, error: "Invalid email address" });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    const data = await resend.emails.send({
      from: `Zomorod Medical Supplies <${fromEmail}>`,
      to: ["info@zomorodmedical.com"],
      subject: `New Inquiry from ${safeName}`,
      html: `
        <h2>New Inquiry</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return send(res, 200, { ok: true, data });
  } catch (error) {
    return send(res, 500, {
      ok: false,
      error: error?.message || "Failed to send email",
    });
  }
}
