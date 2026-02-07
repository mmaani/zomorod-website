import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth.js";

const EMPTY_FORM = {
  title: "",
  department: "",
  locationCountry: "",
  locationCity: "",
  employmentType: "",
  description: "",
  isPublished: false,
};

function toHtml(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]))}</p>`)
    .join("");
}

function fromHtml(html) {
  if (!html) return "";
  if (typeof window === "undefined") return String(html).replace(/<[^>]+>/g, " ");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\n{2,}/g, "\n").trim();
}

export default function RecruitmentPage() {
  const isMain = hasRole("main");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const publishedCount = useMemo(() => jobs.filter((j) => j.is_published).length, [jobs]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [jobsRes, appsRes] = await Promise.all([
        apiFetch("/recruitment?resource=jobs_admin"),
        apiFetch("/recruitment?resource=applications"),
      ]);
      if (!jobsRes || !appsRes) return;

      const jobsData = await jobsRes.json().catch(() => ({}));
      const appsData = await appsRes.json().catch(() => ({}));

      if (!jobsRes.ok || !jobsData.ok) throw new Error(jobsData.error || "Failed to load jobs");
      if (!appsRes.ok || !appsData.ok) throw new Error(appsData.error || "Failed to load applications");

      setJobs(Array.isArray(jobsData.jobs) ? jobsData.jobs : []);
      setApplications(Array.isArray(appsData.applications) ? appsData.applications : []);
    } catch (e) {
      setError(e?.message || "Failed to load recruitment data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isMain) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMain]);

  function startEdit(job) {
    setEditingId(job.id);
    setForm({
      title: job.title || "",
      department: job.department || "",
      locationCountry: job.location_country || "",
      locationCity: job.location_city || "",
      employmentType: job.employment_type || "",
      description: fromHtml(job.job_description_html || ""),
      isPublished: job.is_published === true,
    });
    setOk("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveJob(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOk("");

    const payload = {
      id: editingId || undefined,
      title: String(form.title || "").trim(),
      department: String(form.department || "").trim(),
      locationCountry: String(form.locationCountry || "").trim(),
      locationCity: String(form.locationCity || "").trim(),
      employmentType: String(form.employmentType || "").trim(),
      jobDescriptionHtml: toHtml(form.description),
      isPublished: form.isPublished === true,
    };

    if (!payload.title || !payload.jobDescriptionHtml) {
      setError("Title and job description are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch(`/recruitment?resource=jobs`, {
        method: editingId ? "PATCH" : "POST",
        body: payload,
      });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save job");

      setOk(editingId ? "Job updated." : "Job created.");
      resetForm();
      await loadAll();
    } catch (e2) {
      setError(e2?.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  async function unpublishJob(id) {
    setError("");
    setOk("");
    try {
      const res = await apiFetch(`/recruitment?resource=jobs&id=${id}`, { method: "DELETE" });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to unpublish");
      setOk("Job unpublished.");
      await loadAll();
    } catch (e) {
      setError(e?.message || "Failed to unpublish");
    }
  }

  if (!isMain) {
    return (
      <section className="crm-card">
        <h2>Recruitment</h2>
        <p className="muted">Only main administrators can manage recruitment.</p>
      </section>
    );
  }

  return (
    <div className="crm-grid-2col">
      <section className="crm-card">
        <h2>{editingId ? "Edit Vacancy" : "Create Vacancy"}</h2>
        <p className="muted">Publish professional recruitment announcements and collect applications in CRM.</p>

        <form className="crm-form-grid" onSubmit={saveJob}>
          <div className="field">
            <label>Job title</label>
            <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          </div>

          <div className="crm-grid-2">
            <div className="field">
              <label>Department</label>
              <input value={form.department} onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))} />
            </div>
            <div className="field">
              <label>Employment type</label>
              <input value={form.employmentType} onChange={(e) => setForm((s) => ({ ...s, employmentType: e.target.value }))} placeholder="Full-time / Part-time" />
            </div>
          </div>

          <div className="crm-grid-2">
            <div className="field">
              <label>Country</label>
              <input value={form.locationCountry} onChange={(e) => setForm((s) => ({ ...s, locationCountry: e.target.value }))} />
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.locationCity} onChange={(e) => setForm((s) => ({ ...s, locationCity: e.target.value }))} />
            </div>
          </div>

          <div className="field">
            <label>Job description</label>
            <textarea rows={7} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Add responsibilities, requirements, and benefits." />
          </div>

          <label className="crm-check">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((s) => ({ ...s, isPublished: e.target.checked }))} />
            Publish on main website
          </label>

          <div className="row">
            <button className="crm-btn crm-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : (editingId ? "Update vacancy" : "Create vacancy")}</button>
            {editingId ? <button type="button" className="crm-btn crm-btn-outline" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>

        {error ? <div className="banner" style={{ marginTop: 12 }}>{error}</div> : null}
        {ok ? <div className="crm-success" style={{ marginTop: 12 }}>{ok}</div> : null}
      </section>

      <section className="crm-card">
        <h2>Recruitment Overview</h2>
        <p className="muted">Published vacancies: {publishedCount} / {jobs.length}</p>

        {loading ? <p className="muted">Loading...</p> : (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.title}</td>
                    <td>{[job.location_city, job.location_country].filter(Boolean).join(", ") || "—"}</td>
                    <td>{job.is_published ? "Published" : "Draft"}</td>
                    <td className="row">
                      <button className="crm-btn crm-btn-outline" onClick={() => startEdit(job)}>Edit</button>
                      {job.is_published ? <button className="crm-btn crm-btn-outline" onClick={() => unpublishJob(job.id)}>Unpublish</button> : null}
                    </td>
                  </tr>
                ))}
                {!jobs.length ? <tr><td colSpan={4} className="muted">No vacancies yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="crm-card crm-span-2">
        <h2>Applications</h2>
        <p className="muted">CV and cover files are uploaded to Google Drive and logged in Google Sheets.</p>

        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Location</th>
                <th>Phone</th>
                <th>Education</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.first_name} {a.last_name}</td>
                  <td>{a.job_title}</td>
                  <td>{a.city}, {a.country}</td>
                  <td>{a.phone || "—"}</td>
                  <td>{a.education_level}</td>
                  <td>
                    <a href={a.cv_drive_link} target="_blank" rel="noreferrer">CV</a>
                    {a.cover_drive_link ? <> · <a href={a.cover_drive_link} target="_blank" rel="noreferrer">Cover</a></> : null}
                  </td>
                </tr>
              ))}
              {!applications.length ? <tr><td colSpan={6} className="muted">No applications yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}