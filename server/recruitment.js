import { getSql } from "../lib/db.js";
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
let recruitmentSchemaReady = false;

async function ensureRecruitmentSchema(sql) {
  if (recruitmentSchemaReady) return;

  await sql`CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT,
    location_country TEXT,
    location_city TEXT,
    employment_type TEXT,
    job_description_html TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_country TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_city TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_description_html TEXT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`UPDATE jobs SET is_published = FALSE WHERE is_published IS NULL`;
  await sql`UPDATE jobs SET created_at = NOW() WHERE created_at IS NULL`;
  await sql`UPDATE jobs SET updated_at = NOW() WHERE updated_at IS NULL`;

  await sql`CREATE TABLE IF NOT EXISTS job_applications (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    education_level TEXT,
    country TEXT,
    city TEXT,
    cv_drive_file_id TEXT,
    cv_drive_link TEXT,
    cover_drive_file_id TEXT,
    cover_drive_link TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_id BIGINT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS first_name TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS last_name TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS education_level TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS country TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS city TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_drive_file_id TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_drive_link TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_drive_file_id TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_drive_link TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;

  await sql`CREATE INDEX IF NOT EXISTS idx_jobs_is_published ON jobs (is_published, published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications (job_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status, created_at DESC)`;

  recruitmentSchemaReady = true;
}

function getResource(req) {
  const raw = typeof req.originalUrl === "string"
    ? req.originalUrl
    : (typeof req.url === "string" ? req.url : "");

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


function mustEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}
function isSafeClientError(message) {
  return (
    message.startsWith("Missing ") ||
    message.startsWith("Invalid JSON body") ||
    message.startsWith("Request body too large") ||
    message.startsWith("Missing multipart boundary") ||
    message.startsWith("Drive upload failed") ||
    message.startsWith("Google refresh_token exchange failed") ||
    message.startsWith("Sheets append failed") ||
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT")
  );
}
async function getAccessToken() {

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

  const metadata = { name: file.filename, parents: [folderId] };
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.mimeType || "application/octet-stream"}\r\n\r\n`,
    "utf8"
  );
  const post = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([pre, file.buffer, post]);

   const upload = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = await upload.json().catch(() => ({}));
  if (!upload.ok || !data.id) {
    throw new Error(`Drive upload failed (${upload.status}): ${JSON.stringify(data)}`);
  }

  return {
    fileId: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

async function appendSheet(accessToken, spreadsheetId, values) {
  if (!spreadsheetId) return;
  const sheetRange = toStr(process.env.GOOGLE_SHEET_RANGE) || "A:M";
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
    await ensureRecruitmentSchema(sql);
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
        return send(res, 400, { ok: false, error: "title and jobDescriptionHtml are required" });
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
           ${jobDescriptionHtml}, ${isPublished}, ${isPublished ? sql`now()` : null}, now(), now())
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
        return send(res, 400, { ok: false, error: "title and jobDescriptionHtml are required" });
      }

      const department = toStr(body.department) || null;
      const locationCountry = toStr(body.locationCountry) || null;
      const locationCity = toStr(body.locationCity) || null;
      const employmentType = toStr(body.employmentType) || null;
      const isPublished = body.isPublished === true;

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

    if (req.method === "DELETE" && resource === "jobs") {
      if (!(await requireMain(req, res))) return;
      const id = toNum(params.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });
            const mode = toStr(params.get("mode")).toLowerCase();

      if (mode === "hard") {
        const refs = await sql`SELECT COUNT(*)::int AS count FROM job_applications WHERE job_id = ${id}`;
        if (Number(refs?.[0]?.count || 0) > 0) {
          return send(res, 400, { ok: false, error: "Cannot delete a vacancy with applications. Unpublish it instead." });
        }

        const del = await sql`DELETE FROM jobs WHERE id = ${id}`;
        return send(res, 200, { ok: true, deleted: del.count || 0 });
      }

      await sql`UPDATE jobs SET is_published = false, updated_at = now() WHERE id = ${id}`;
      return send(res, 200, { ok: true, mode: "soft" });
        }

    if (req.method === "POST" && resource === "apply") {
      const body = await readBody(req);
      const { fields, files } = parseMultipart(req, body);

      const jobId = toNum(fields.jobId);
      const firstName = toStr(fields.firstName);
      const lastName = toStr(fields.lastName);
      const email = toStr(fields.email);
      const phone = toStr(fields.phone);
      const educationLevel = toStr(fields.educationLevel);
      const country = toStr(fields.country);
      const city = toStr(fields.city);

      if (!jobId || !firstName || !lastName || !email || !phone || !educationLevel || !country || !city) {
        return send(res, 400, { ok: false, error: "jobId, firstName, lastName, email, phone, educationLevel, country, city are required" });
      }
     
      if (!files.cv?.buffer?.length) return send(res, 400, { ok: false, error: "cv file is required" });

      const job = await sql`SELECT id FROM jobs WHERE id = ${jobId} AND is_published = true LIMIT 1`;
      if (!job.length) return send(res, 404, { ok: false, error: "Job not found or unpublished" });

      const folderId = toStr(process.env.GOOGLE_DRIVE_FOLDER_ID);
      if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");
      const accessToken = await getAccessToken();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safe = `${firstName}_${lastName}`.replace(/[^\w-]+/g, "_");
      const cv = await uploadFileToDrive(accessToken, folderId, {
        ...files.cv,
        filename: `CV_${safe}_${stamp}_${files.cv.filename || "file"}`,
      });

      let cover = null;
      if (files.cover?.buffer?.length) {
          try {
                cover = await uploadFileToDrive(accessToken, folderId, {
                  ...files.cover,
                  filename: `Cover_${safe}_${stamp}_${files.cover.filename || "file"}`,
                });
              } catch (err) {
                console.warn("Cover upload failed, continuing without cover link", err);
              }
            }
        
      const ins = await sql`
        INSERT INTO job_applications
        (job_id, first_name, last_name, email, phone, education_level, country, city,
          cv_drive_file_id, cv_drive_link, cover_drive_file_id, cover_drive_link,
          status, created_at)
        VALUES
          (${jobId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${educationLevel}, ${country}, ${city},
          ${cv.fileId}, ${cv.webViewLink}, ${cover?.fileId || null}, ${cover?.webViewLink || null},
          'new', now())
        RETURNING id
      `;

      const sheetId = toStr(process.env.GOOGLE_SHEET_ID);
        let sheetSyncError = "";
        if (sheetId) {
        try {
          await appendSheet(accessToken, sheetId, [
            ins[0].id,
            jobId,
            firstName,
            lastName,
            email,
            phone,
            educationLevel,
            country,
            city,
            cv.webViewLink,
            cover?.webViewLink || "",
            "new",
            new Date().toISOString(),
          ]);
          } catch (err) {
            sheetSyncError = String(err?.message || err);
            console.warn("Sheets append failed, application remains saved", err);
        }
      }

      return send(res, 201, { ok: true, applicationId: ins[0].id });
    }

    if (req.method === "GET" && resource === "applications") {
      if (!(await requireMain(req, res))) return;
      const jobId = toNum(params.get("jobId")) || null;

      const rows = await sql`
        SELECT a.id, a.job_id, j.title AS job_title, a.first_name, a.last_name,
               a.education_level, a.country, a.city, a.cv_drive_link, a.cover_drive_link,
               a.email, a.phone, a.status, a.created_at
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
  recruitmentSchemaReady = false;
  if (isSafeClientError(message)) {
    return send(res, 400, { ok: false, error: message });
  }
  return send(res, 500, { ok: false, error: "Server error", detail: message });
  }
  
  }