// api/contact.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

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

export default async function handler(req, res) {
  if ((req.method || "").toUpperCase() !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
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
