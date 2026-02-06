import { createSign } from "node:crypto";
import { getSql } from "../lib/db.js";
import { getGoogleServiceAccount } from "../lib/google-sa.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function s(v) {
  return String(v ?? "").trim();
}

function b64url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function parseQuery(req) {
  const u = new URL(req.url || "", "http://localhost");
  return u.searchParams;
}

async function readBodyBuffer(req, maxBytes = 12 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseMultipart(req, body) {
  const ct = String(req.headers["content-type"] || "");
  const m = ct.match(/boundary=([^;]+)/i);
  if (!m) throw new Error("Missing multipart boundary");

  const boundary = m[1].trim().replace(/^"|"$/g, "");
  const delimiter = `--${boundary}`;
  const raw = body.toString("latin1");
  const sections = raw.split(delimiter);

  const fields = {};
  const files = {};

  for (let part of sections) {
    if (!part || part === "--" || part === "--\r\n") continue;
    if (part.startsWith("\r\n")) part = part.slice(2);
    if (part.endsWith("\r\n")) part = part.slice(0, -2);
    if (part.endsWith("--")) part = part.slice(0, -2);

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const rawHeaders = part.slice(0, headerEnd);
    let content = part.slice(headerEnd + 4);
    if (content.endsWith("\r\n")) content = content.slice(0, -2);

    const disp = rawHeaders.match(/content-disposition:\s*form-data;([^\n\r]+)/i)?.[1] || "";
    const name = disp.match(/name="([^"]+)"/i)?.[1];
    if (!name) continue;

    const filename = disp.match(/filename="([^"]*)"/i)?.[1];
    const mimeType = rawHeaders.match(/content-type:\s*([^\n\r]+)/i)?.[1]?.trim() || "application/octet-stream";

    if (filename != null && filename !== "") {
      files[name] = {
        filename,
        mimeType,
        buffer: Buffer.from(content, "latin1"),
      };
    } else {
      fields[name] = content;
    }
  }

  return { fields, files };
}

async function getGoogleAccessToken(sa, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const assertion = `${signingInput}.${b64url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !data.access_token) {
    throw new Error(`Google token exchange failed (${tokenRes.status})`);
  }

  return data.access_token;
}

async function uploadToDrive({ accessToken, folderId, file }) {
  const boundary = `zomorod_${Date.now()}`;
  const meta = { name: file.filename, parents: [folderId] };

  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.mimeType || "application/octet-stream"}\r\n\r\n`,
    "utf8"
  );
  const post = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([pre, file.buffer, post]);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const uploaded = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploaded.id) {
    throw new Error(`Drive upload failed (${uploadRes.status})`);
  }

  await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return {
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

async function appendToSheet({ accessToken, spreadsheetId, values }) {
  if (!spreadsheetId) return;
  const range = encodeURIComponent("Sheet1!A:K");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!r.ok) throw new Error(`Sheets append failed (${r.status})`);
}

async function readJson(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      throw new Error("Invalid JSON body");
    }
  }
  if (body && typeof body === "object") return body;

  const bodyBuf = await readBodyBuffer(req);
  if (!bodyBuf.length) return {};
  try {
    return JSON.parse(bodyBuf.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default async function recruitmentHandler(req, res) {
  try {
    const sql = getSql();
    const q = parseQuery(req);
    const method = req.method;
    const resource = String(q.get("resource") || "").toLowerCase();

    if (method === "GET" && resource === "jobs") {
      const rows = await sql`
        SELECT id, title, department, location_country, location_city, employment_type,
               job_description_html, is_published, published_at, created_at, updated_at
        FROM jobs
        WHERE is_published = true
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT 100
      `;
      return send(res, 200, { ok: true, jobs: rows });
    }

    if (method === "GET" && resource === "jobs_admin") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;
      const rows = await sql`
        SELECT id, title, department, location_country, location_city, employment_type,
               job_description_html, is_published, published_at, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC, id DESC
        LIMIT 200
      `;
      return send(res, 200, { ok: true, jobs: rows });
    }

    if (method === "POST" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;
      const body = await readJson(req);

      const title = s(body.title);
      const jobDescriptionHtml = s(body.jobDescriptionHtml);
      const department = s(body.department) || null;
      const locationCountry = s(body.locationCountry) || null;
      const locationCity = s(body.locationCity) || null;
      const employmentType = s(body.employmentType) || null;
      const isPublished = body.isPublished === true;

      if (!title || !jobDescriptionHtml) {
        return send(res, 400, { ok: false, error: "title and jobDescriptionHtml are required" });
      }

      const ins = await sql`
        INSERT INTO jobs
          (title, department, location_country, location_city, employment_type,
           job_description_html, is_published, published_at, created_at, updated_at)
        VALUES
          (${title}, ${department}, ${locationCountry}, ${locationCity}, ${employmentType},
           ${jobDescriptionHtml}, ${isPublished}, ${isPublished ? sql`now()` : null}, now(), now())
        RETURNING id
      `;

      return send(res, 201, { ok: true, id: ins[0].id });
    }

    if (method === "PATCH" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;
      const body = await readJson(req);

      const id = n(body.id);
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const title = s(body.title);
      const jobDescriptionHtml = s(body.jobDescriptionHtml);
      const department = s(body.department) || null;
      const locationCountry = s(body.locationCountry) || null;
      const locationCity = s(body.locationCity) || null;
      const employmentType = s(body.employmentType) || null;
      const isPublished = body.isPublished === true;

      if (!title || !jobDescriptionHtml) {
        return send(res, 400, { ok: false, error: "title and jobDescriptionHtml are required" });
      }

      await sql.begin(async (tx) => {
        const cur = await tx`SELECT id, published_at FROM jobs WHERE id = ${id} LIMIT 1`;
        if (!cur.length) throw new Error("JOB_NOT_FOUND");
        const publishedAt = isPublished && !cur[0].published_at ? tx`now()` : cur[0].published_at;

        await tx`
          UPDATE jobs
          SET title = ${title}, department = ${department}, location_country = ${locationCountry},
              location_city = ${locationCity}, employment_type = ${employmentType},
              job_description_html = ${jobDescriptionHtml}, is_published = ${isPublished},
              published_at = ${publishedAt}, updated_at = now()
          WHERE id = ${id}
        `;
      });

      return send(res, 200, { ok: true });
    }

    if (method === "DELETE" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;
      const id = n(q.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      await sql`UPDATE jobs SET is_published = false, updated_at = now() WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    if (method === "POST" && resource === "apply") {
      const bodyBuf = await readBodyBuffer(req);
      const { fields, files } = parseMultipart(req, bodyBuf);

      const jobId = n(fields.jobId);
      const firstName = s(fields.firstName);
      const lastName = s(fields.lastName);
      const educationLevel = s(fields.educationLevel);
      const country = s(fields.country);
      const city = s(fields.city);

      if (!jobId || !firstName || !lastName || !educationLevel || !country || !city) {
        return send(res, 400, { ok: false, error: "jobId, firstName, lastName, educationLevel, country, city are required" });
      }
      if (!files.cv?.buffer?.length) {
        return send(res, 400, { ok: false, error: "cv file is required" });
      }

      const job = await sql`SELECT id, title FROM jobs WHERE id = ${jobId} AND is_published = true LIMIT 1`;
      if (!job.length) return send(res, 404, { ok: false, error: "Job not found or unpublished" });

      const folderId = String(process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();
      if (!folderId) return send(res, 500, { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" });

      const sa = getGoogleServiceAccount();
      const accessToken = await getGoogleAccessToken(sa, [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
      ]);

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = `${firstName}_${lastName}`.replace(/[^\w-]+/g, "_");

      const cv = await uploadToDrive({
        accessToken,
        folderId,
        file: {
          ...files.cv,
          filename: `CV_${safeName}_${stamp}_${files.cv.filename || "file"}`,
        },
      });

      let cover = null;
      if (files.cover?.buffer?.length) {
        cover = await uploadToDrive({
          accessToken,
          folderId,
          file: {
            ...files.cover,
            filename: `Cover_${safeName}_${stamp}_${files.cover.filename || "file"}`,
          },
        });
      }

      const ins = await sql`
        INSERT INTO job_applications
          (job_id, first_name, last_name, education_level, country, city,
           cv_drive_file_id, cv_drive_link, cover_drive_file_id, cover_drive_link,
           status, created_at)
        VALUES
          (${jobId}, ${firstName}, ${lastName}, ${educationLevel}, ${country}, ${city},
           ${cv.fileId}, ${cv.webViewLink}, ${cover?.fileId || null}, ${cover?.webViewLink || null},
           'new', now())
        RETURNING id
      `;

      const sheetId = String(process.env.GOOGLE_SHEET_ID || "").trim();
      if (sheetId) {
        await appendToSheet({
          accessToken,
          spreadsheetId: sheetId,
          values: [
            ins[0].id,
            jobId,
            firstName,
            lastName,
            educationLevel,
            country,
            city,
            cv.webViewLink,
            cover?.webViewLink || "",
            "new",
            new Date().toISOString(),
          ],
        });
      }

      return send(res, 201, { ok: true, applicationId: ins[0].id });
    }

    if (method === "GET" && resource === "applications") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const jobId = n(q.get("jobId")) || null;
      const rows = await sql`
        SELECT a.id, a.job_id, j.title AS job_title, a.first_name, a.last_name,
               a.education_level, a.country, a.city, a.cv_drive_link, a.cover_drive_link,
               a.status, a.created_at
        FROM job_applications a
        JOIN jobs j ON j.id = a.job_id
        WHERE (${jobId}::int IS NULL OR a.job_id = ${jobId})
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 300
      `;

      return send(res, 200, { ok: true, applications: rows });
    }

    return send(res, 400, { ok: false, error: "Unknown route. Use ?resource=..." });
  } catch (err) {
    const message = String(err?.message || err);
    if (message === "JOB_NOT_FOUND") return send(res, 404, { ok: false, error: "Job not found" });
    return send(res, 500, { ok: false, error: "Server error", detail: message });
  }
}
