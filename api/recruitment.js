// api/recruitment.js
import Busboy from "busboy";
import { google } from "googleapis";
import { getSql } from "../lib/db.js";
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

// -------- Google Drive helpers --------
function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });
  return { drive, folderId };
}

// upload buffer -> Drive file -> returns {fileId, webViewLink}
async function uploadToDrive({ filename, mimeType, buffer, folderId, drive }) {
  const media = {
    mimeType: mimeType || "application/octet-stream",
    body: Buffer.from(buffer),
  };

  const fileMetadata = {
    name: filename,
    parents: [folderId],
  };

  const created = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  const fileId = created?.data?.id;
  if (!fileId) throw new Error("Drive upload failed (no file id)");

  // Make file viewable by anyone with link (so CRM can open it)
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Re-fetch link (sometimes not included initially)
  const meta = await drive.files.get({
    fileId,
    fields: "id, webViewLink",
  });

  return {
    fileId,
    webViewLink: meta?.data?.webViewLink || null,
  };
}

// -------- multipart parser --------
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });

    const fields = {};
    const files = {}; // { cv: {buffer, filename, mimeType}, cover: {...} }

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => reject(new Error(`File too large: ${name}`)));
      file.on("end", () => {
        files[name] = {
          filename: filename || `${name}.bin`,
          mimeType,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));

    req.pipe(bb);
  });
}

// -------- slug helper --------
function slugify(title) {
  return s(title)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    const method = req.method || "GET";

    const url = new URL(req.url, "http://localhost");
    const resource = s(url.searchParams.get("resource"));

    // ---------------------------
    // PUBLIC: list jobs
    // GET /api/recruitment?resource=jobs
    // ---------------------------
    if (method === "GET" && resource === "jobs") {
      const slug = s(url.searchParams.get("slug"));

      if (slug) {
        const rows = await sql`
          SELECT id, title, slug, department, location_country, location_city, employment_type,
                 job_description_html, is_published, published_at, created_at, updated_at
          FROM jobs
          WHERE slug = ${slug} AND is_published = true
          LIMIT 1
        `;
        if (!rows.length) return send(res, 404, { ok: false, error: "Job not found" });
        return send(res, 200, { ok: true, job: rows[0] });
      }

      const rows = await sql`
        SELECT id, title, slug, department, location_country, location_city, employment_type,
               published_at
        FROM jobs
        WHERE is_published = true
        ORDER BY published_at DESC NULLS LAST, id DESC
      `;
      return send(res, 200, { ok: true, jobs: rows });
    }

    // ---------------------------
    // ADMIN: list jobs (including unpublished)
    // GET /api/recruitment?resource=jobs_admin
    // ---------------------------
    if (method === "GET" && resource === "jobs_admin") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const rows = await sql`
        SELECT id, title, slug, department, location_country, location_city, employment_type,
               is_published, published_at, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC, id DESC
      `;
      return send(res, 200, { ok: true, jobs: rows });
    }

    // ---------------------------
    // ADMIN: create job
    // POST /api/recruitment?resource=jobs
    // JSON body
    // ---------------------------
    if (method === "POST" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: "Invalid JSON" }); }

      const title = s(body?.title);
      const department = s(body?.department) || null;
      const locationCountry = s(body?.locationCountry) || null;
      const locationCity = s(body?.locationCity) || null;
      const employmentType = s(body?.employmentType) || null;
      const jobDescriptionHtml = s(body?.jobDescriptionHtml);
      const isPublished = body?.isPublished === true;

      if (!title) return send(res, 400, { ok: false, error: "title is required" });
      if (!jobDescriptionHtml) return send(res, 400, { ok: false, error: "jobDescriptionHtml is required" });

      const baseSlug = slugify(title);
      if (!baseSlug) return send(res, 400, { ok: false, error: "title cannot produce slug" });

      // make slug unique
      let slug = baseSlug;
      for (let i = 1; i <= 50; i++) {
        const chk = await sql`SELECT id FROM jobs WHERE slug = ${slug} LIMIT 1`;
        if (!chk.length) break;
        slug = `${baseSlug}-${i}`;
      }

      const ins = await sql`
        INSERT INTO jobs
          (title, slug, department, location_country, location_city, employment_type,
           job_description_html, is_published, published_at, created_by, created_at, updated_at)
        VALUES
          (${title}, ${slug}, ${department}, ${locationCountry}, ${locationCity}, ${employmentType},
           ${jobDescriptionHtml}, ${isPublished},
           ${isPublished ? sql`now()` : null},
           ${auth.sub || null}, now(), now())
        RETURNING id, slug
      `;

      return send(res, 201, { ok: true, id: ins[0].id, slug: ins[0].slug });
    }

    // ---------------------------
    // ADMIN: update job
    // PATCH /api/recruitment?resource=jobs
    // JSON body
    // ---------------------------
    if (method === "PATCH" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: "Invalid JSON" }); }

      const id = n(body?.id);
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const title = s(body?.title);
      const department = s(body?.department) || null;
      const locationCountry = s(body?.locationCountry) || null;
      const locationCity = s(body?.locationCity) || null;
      const employmentType = s(body?.employmentType) || null;
      const jobDescriptionHtml = s(body?.jobDescriptionHtml);
      const isPublished = body?.isPublished === true;

      if (!title) return send(res, 400, { ok: false, error: "title is required" });
      if (!jobDescriptionHtml) return send(res, 400, { ok: false, error: "jobDescriptionHtml is required" });

      // publish timestamp only when switching to published and published_at is null
      await sql.begin(async (tx) => {
        const cur = await tx`SELECT is_published, published_at FROM jobs WHERE id = ${id} LIMIT 1`;
        if (!cur.length) throw new Error("JOB_NOT_FOUND");

        const shouldSetPublishedAt = isPublished && !cur[0].published_at;

        await tx`
          UPDATE jobs
          SET
            title = ${title},
            department = ${department},
            location_country = ${locationCountry},
            location_city = ${locationCity},
            employment_type = ${employmentType},
            job_description_html = ${jobDescriptionHtml},
            is_published = ${isPublished},
            published_at = ${shouldSetPublishedAt ? sql`now()` : cur[0].published_at},
            updated_at = now()
          WHERE id = ${id}
        `;
      });

      return send(res, 200, { ok: true });
    }

    // ---------------------------
    // ADMIN: delete job (soft = unpublish)
    // DELETE /api/recruitment?resource=jobs&id=123
    // ---------------------------
    if (method === "DELETE" && resource === "jobs") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      // soft delete: just unpublish
      await sql`
        UPDATE jobs
        SET is_published = false, updated_at = now()
        WHERE id = ${id}
      `;
      return send(res, 200, { ok: true });
    }

    // ---------------------------
    // PUBLIC: apply (multipart)
    // POST /api/recruitment?resource=apply
    // form-data fields:
    //  jobId, firstName, lastName, educationLevel, country, city
    // files:
    //  cv, cover
    // ---------------------------
    if (method === "POST" && resource === "apply") {
      const { fields, files } = await parseMultipart(req);

      const jobId = n(fields.jobId);
      const firstName = s(fields.firstName);
      const lastName = s(fields.lastName);
      const educationLevel = s(fields.educationLevel);
      const country = s(fields.country);
      const city = s(fields.city);

      if (!jobId) return send(res, 400, { ok: false, error: "jobId is required" });
      if (!firstName || !lastName) return send(res, 400, { ok: false, error: "First/Last name required" });
      if (!educationLevel) return send(res, 400, { ok: false, error: "educationLevel is required" });
      if (!country || !city) return send(res, 400, { ok: false, error: "country and city are required" });

      // ensure job exists and published
      const job = await sql`SELECT id, title FROM jobs WHERE id = ${jobId} AND is_published = true LIMIT 1`;
      if (!job.length) return send(res, 404, { ok: false, error: "Job not found or not published" });

      const { drive, folderId } = getDriveClient();

      // Upload files if present
      let cv = null;
      let cover = null;

      // naming
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = `${firstName}_${lastName}`.replace(/[^\w-]+/g, "_");

      if (files.cv?.buffer?.length) {
        cv = await uploadToDrive({
          filename: `CV_${safeName}_${stamp}_${files.cv.filename}`,
          mimeType: files.cv.mimeType,
          buffer: files.cv.buffer,
          folderId,
          drive,
        });
      }

      if (files.cover?.buffer?.length) {
        cover = await uploadToDrive({
          filename: `Cover_${safeName}_${stamp}_${files.cover.filename}`,
          mimeType: files.cover.mimeType,
          buffer: files.cover.buffer,
          folderId,
          drive,
        });
      }

      const ins = await sql`
        INSERT INTO job_applications
          (job_id, first_name, last_name, education_level, country, city,
           cv_drive_file_id, cv_drive_link, cover_drive_file_id, cover_drive_link,
           status, created_at)
        VALUES
          (${jobId}, ${firstName}, ${lastName}, ${educationLevel}, ${country}, ${city},
           ${cv?.fileId || null}, ${cv?.webViewLink || null},
           ${cover?.fileId || null}, ${cover?.webViewLink || null},
           'new', now())
        RETURNING id
      `;

      return send(res, 201, { ok: true, applicationId: ins[0].id });
    }

    // ---------------------------
    // ADMIN: list applications
    // GET /api/recruitment?resource=applications
    // optional jobId=...
    // ---------------------------
    if (method === "GET" && resource === "applications") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const jobId = n(url.searchParams.get("jobId")) || null;

      const rows = await sql`
        SELECT
          a.id,
          a.job_id,
          j.title AS job_title,
          a.first_name,
          a.last_name,
          a.education_level,
          a.country,
          a.city,
          a.cv_drive_link,
          a.cover_drive_link,
          a.status,
          a.created_at
        FROM job_applications a
        JOIN jobs j ON j.id = a.job_id
        WHERE (${jobId}::int IS NULL OR a.job_id = ${jobId})
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 200
      `;

      return send(res, 200, { ok: true, applications: rows });
    }

    return send(res, 400, { ok: false, error: "Unknown route. Use ?resource=..." });
  } catch (err) {
    console.error("api/recruitment error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
