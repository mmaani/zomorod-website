import { createSign } from "node:crypto";
import { getSql } from "../lib/db.js";
import { getGoogleServiceAccount } from "../lib/google-sa.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toStr = (v) => String(v ?? "").trim();

function getResource(req) {
  // Express has req.originalUrl; fallback to req.url
  const raw = typeof req.originalUrl === "string"
    ? req.originalUrl
    : (typeof req.url === "string" ? req.url : "");

  // Ensure it always parses
  const url = new URL(raw.startsWith("/") ? raw : `/${raw}`, "http://127.0.0.1");

  return {
    resource: String(url.searchParams.get("resource") || "").toLowerCase(),
    params: url.searchParams,
  };
}

async function readBody(req, maxBytes = 12 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const body = await readBody(req);
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function parseMultipart(req, rawBody) {
  const ct = String(req.headers["content-type"] || "");
  const boundaryMatch = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  const delimiter = `--${boundary}`;
  const raw = rawBody.toString("latin1");
  const parts = raw.split(delimiter);
  const fields = {};
  const files = {};

  for (let part of parts) {
    if (!part || part === "--" || part === "--\r\n") continue;
    if (part.startsWith("\r\n")) part = part.slice(2);
    if (part.endsWith("\r\n")) part = part.slice(0, -2);
    if (part.endsWith("--")) part = part.slice(0, -2);

    const sep = part.indexOf("\r\n\r\n");
    if (sep < 0) continue;

    const headers = part.slice(0, sep);
    let content = part.slice(sep + 4);
    if (content.endsWith("\r\n")) content = content.slice(0, -2);

    const disp =
      headers.match(/content-disposition:\s*form-data;([^\n\r]+)/i)?.[1] || "";
    const name = disp.match(/name="([^"]+)"/i)?.[1];
    if (!name) continue;

    const filename = disp.match(/filename="([^"]*)"/i)?.[1];
    const mimeType =
      headers.match(/content-type:\s*([^\n\r]+)/i)?.[1]?.trim() ||
      "application/octet-stream";

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

function b64url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function mustEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function getAccessToken(scopes) {
  // scopes param kept for compatibility; Google decides scopes from the refresh token grant.
  // You can optionally validate scopes here if you want.
  void scopes;
console.log("Using OAuth refresh token flow (client_id ends with):", String(clientId).slice(-20));

  const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = mustEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error(`Google refresh_token exchange failed (${resp.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}


async function uploadFileToDrive(accessToken, folderId, file) {
  const boundary = `zomorod_${Date.now()}`;

  // IMPORTANT: ensure we always attach into the target folder
  const metadata = {
    name: file.filename,
    parents: [folderId],
  };

  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n` +
      `--${boundary}\r\nContent-Type: ${
        file.mimeType || "application/octet-stream"
      }\r\n\r\n`,
    "utf8"
  );
  const post = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([pre, file.buffer, post]);

  // supportsAllDrives is harmless for My Drive, but helps if a folder ever ends up elsewhere.
  const uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files" +
    "?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const data = await upload.json().catch(() => ({}));
  if (!upload.ok || !data.id) {
    // give you the REAL reason (often: "insufficientPermissions", "insufficientAuthenticationScopes", etc.)
    throw new Error(
      `Drive upload failed (${upload.status}): ${JSON.stringify(data)}`
    );
  }

  // Make file viewable via link (optional). If your org blocks "anyone" sharing, this may fail.
  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );

  if (!permRes.ok) {
    // Don't fail the entire application if org policy blocks public sharing.
    const permData = await permRes.json().catch(() => ({}));
    // You can inspect this in your API response detail if needed.
    // (CV is still uploaded and linked may still be accessible to account holders.)
    // If you prefer hard-fail, replace this block with: throw new Error(...)
    // eslint-disable-next-line no-console
    console.warn(
      "Drive permission set failed:",
      permRes.status,
      JSON.stringify(permData)
    );
  }

  return {
    fileId: data.id,
    webViewLink:
      data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

async function appendSheet(accessToken, spreadsheetId, values) {
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

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Sheets append failed (${r.status}): ${detail}`);
  }
}

async function requireMain(req, res) {
  const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
  return !!auth;
}

export default async function recruitmentHandler(req, res) {
  try {
    const sql = getSql();
    const { resource, params } = getResource(req);

    if (req.method === "GET" && resource === "jobs") {
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

    if (req.method === "GET" && resource === "jobs_admin") {
      if (!(await requireMain(req, res))) return;
      const rows = await sql`
        SELECT id, title, department, location_country, location_city, employment_type,
               job_description_html, is_published, published_at, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC, id DESC
        LIMIT 200
      `;
      return send(res, 200, { ok: true, jobs: rows });
    }

    if (req.method === "POST" && resource === "jobs") {
      if (!(await requireMain(req, res))) return;
      const body = await readJson(req);

      const title = toStr(body.title);
      const jobDescriptionHtml = toStr(body.jobDescriptionHtml);
      if (!title || !jobDescriptionHtml) {
        return send(res, 400, {
          ok: false,
          error: "title and jobDescriptionHtml are required",
        });
      }

      const department = toStr(body.department) || null;
      const locationCountry = toStr(body.locationCountry) || null;
      const locationCity = toStr(body.locationCity) || null;
      const employmentType = toStr(body.employmentType) || null;
      const isPublished = body.isPublished === true;

      const ins = await sql`
        INSERT INTO jobs
          (title, department, location_country, location_city, employment_type,
           job_description_html, is_published, published_at, created_at, updated_at)
        VALUES
          (${title}, ${department}, ${locationCountry}, ${locationCity}, ${employmentType},
           ${jobDescriptionHtml}, ${isPublished}, ${
        isPublished ? sql`now()` : null
      }, now(), now())
        RETURNING id
      `;

      return send(res, 201, { ok: true, id: ins[0].id });
    }

    if (req.method === "PATCH" && resource === "jobs") {
      if (!(await requireMain(req, res))) return;
      const body = await readJson(req);
      const id = toNum(body.id);
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const title = toStr(body.title);
      const jobDescriptionHtml = toStr(body.jobDescriptionHtml);
      if (!title || !jobDescriptionHtml) {
        return send(res, 400, {
          ok: false,
          error: "title and jobDescriptionHtml are required",
        });
      }

      const department = toStr(body.department) || null;
      const locationCountry = toStr(body.locationCountry) || null;
      const locationCity = toStr(body.locationCity) || null;
      const employmentType = toStr(body.employmentType) || null;
      const isPublished = body.isPublished === true;

      await sql.begin(async (tx) => {
        const cur = await tx`SELECT id, published_at FROM jobs WHERE id = ${id} LIMIT 1`;
        if (!cur.length) throw new Error("JOB_NOT_FOUND");
        const publishedAt =
          isPublished && !cur[0].published_at ? tx`now()` : cur[0].published_at;

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

    if (req.method === "DELETE" && resource === "jobs") {
      if (!(await requireMain(req, res))) return;
      const id = toNum(params.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });
      await sql`UPDATE jobs SET is_published = false, updated_at = now() WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && resource === "apply") {
      const body = await readBody(req);
      const { fields, files } = parseMultipart(req, body);

      const jobId = toNum(fields.jobId);
      const firstName = toStr(fields.firstName);
      const lastName = toStr(fields.lastName);
      const email = toStr(fields.email);
      const educationLevel = toStr(fields.educationLevel);
      const country = toStr(fields.country);
      const city = toStr(fields.city);

      if (!jobId || !firstName || !lastName || !email || !educationLevel || !country || !city) {
        return send(res, 400, {
          ok: false,
          error: "jobId, firstName, lastName, email, educationLevel, country, city are required",
        });
      }

      if (!files.cv?.buffer?.length)
        return send(res, 400, { ok: false, error: "cv file is required" });

      const job = await sql`SELECT id FROM jobs WHERE id = ${jobId} AND is_published = true LIMIT 1`;
      if (!job.length)
        return send(res, 404, { ok: false, error: "Job not found or unpublished" });

      const folderId = toStr(process.env.GOOGLE_DRIVE_FOLDER_ID);
      if (!folderId)
        return send(res, 500, { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" });

      // ✅ Use drive.file (best practice) + spreadsheets.
      // drive.file is enough to create/upload and manage files your app creates.
      const accessToken = await getAccessToken([
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ]);

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safe = `${firstName}_${lastName}`.replace(/[^\w-]+/g, "_");

      const cv = await uploadFileToDrive(accessToken, folderId, {
        ...files.cv,
        filename: `CV_${safe}_${stamp}_${files.cv.filename || "file"}`,
      });

      let cover = null;
      if (files.cover?.buffer?.length) {
        cover = await uploadFileToDrive(accessToken, folderId, {
          ...files.cover,
          filename: `Cover_${safe}_${stamp}_${files.cover.filename || "file"}`,
        });
      }

      const ins = await sql`
        INSERT INTO job_applications
          (job_id, first_name, last_name, email, education_level, country, city,
          cv_drive_file_id, cv_drive_link, cover_drive_file_id, cover_drive_link,
          status, created_at)
        VALUES
          (${jobId}, ${firstName}, ${lastName}, ${email}, ${educationLevel}, ${country}, ${city},
          ${cv.fileId}, ${cv.webViewLink}, ${cover?.fileId || null}, ${cover?.webViewLink || null},
          'new', now())
        RETURNING id
      `;

      const sheetId = toStr(process.env.GOOGLE_SHEET_ID);
      if (sheetId) {
        await appendSheet(accessToken, sheetId, [
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
        ]);
      }

      return send(res, 201, { ok: true, applicationId: ins[0].id });
    }

    if (req.method === "GET" && resource === "applications") {
      if (!(await requireMain(req, res))) return;
      const jobId = toNum(params.get("jobId")) || null;

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
    if (message === "JOB_NOT_FOUND")
      return send(res, 404, { ok: false, error: "Job not found" });
    return send(res, 500, { ok: false, error: "Server error", detail: message });
  }
}
