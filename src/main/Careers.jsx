// src/main/Careers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { buildWhatsAppLink } from "./MainLayout.jsx";

const JOBS_PER_PAGE = 5;
const PREVIEW_WORDS = 28; // ~25–30 words

const UI_COPY = {
  en: {
    title: "Careers",
    subtitle: "Open vacancies published from our CRM. Apply directly below.",
    loading: "Loading opportunities…",
    loadError: "Could not load vacancies. Please refresh and try again.",
    empty: "No openings announced at the moment.",
    readMore: "Read more",
    readLess: "Show less",
    selectJob: "Select this job",
    selectedJob: "Selected job",
    selectPlaceholder: "Select a job…",
    selectHint: "You must select a vacancy before applying.",
    pagination: {
      prev: "Previous",
      next: "Next",
      page: "Page",
      of: "of",
      showing: "Showing",
      jobs: "jobs",
    },

    applyTitle: "Apply now",
    applySubtitle: "Submit your information and upload your CV.",
    submit: "Submit application",
    submitting: "Submitting…",
    success: "Your application has been submitted successfully.",
    validationError: "Please select a job and fill all required fields before submitting.",

    fields: {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone number",
      education: "Education level",
      country: "Country",
      city: "City",
      cv: "CV (required)",
      cover: "Cover letter (optional file)",
    },

    educationOptions: ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"],

    whatsapp: {
      title: "Prefer WhatsApp?",
      body:
        "You can also send a short message on WhatsApp and we’ll respond with next steps.",
      cta: "WhatsApp us",
      message: "Hello Zomorod, I want to apply for a vacancy. Please advise the next steps.",
    },


  },

  ar: {
    title: "الوظائف",
    subtitle: "الوظائف المفتوحة المنشورة من CRM. يمكن التقديم مباشرة أدناه.",
    loading: "جاري تحميل الفرص…",
    loadError: "تعذر تحميل الوظائف. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
    empty: "لا توجد وظائف معلنة حالياً.",
    readMore: "اقرأ المزيد",
    readLess: "عرض أقل",
    selectJob: "اختيار هذه الوظيفة",
    selectedJob: "الوظيفة المختارة",
    selectPlaceholder: "اختر وظيفة…",
    selectHint: "يجب اختيار وظيفة قبل التقديم.",
    pagination: {
      prev: "السابق",
      next: "التالي",
      page: "صفحة",
      of: "من",
      showing: "عرض",
      jobs: "وظائف",
    },

    applyTitle: "قدّم الآن",
    applySubtitle: "أدخل معلوماتك وارفع السيرة الذاتية.",
    submit: "إرسال الطلب",
    submitting: "جاري الإرسال…",
    success: "تم إرسال طلبك بنجاح.",
    validationError: "يرجى اختيار وظيفة ثم تعبئة جميع الحقول المطلوبة قبل الإرسال.",

    fields: {
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      education: "المؤهل العلمي",
      country: "الدولة",
      city: "المدينة",
      cv: "السيرة الذاتية (مطلوب)",
      cover: "رسالة تغطية (ملف اختياري)",
    },

    educationOptions: ["ثانوي", "دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "أخرى"],

    whatsapp: {
      title: "تفضّل واتساب؟",
      body: "يمكنك إرسال رسالة قصيرة عبر واتساب وسنرد عليك بالخطوات التالية.",
      cta: "راسلنا واتساب",
      message: "مرحباً زمرد، أريد التقديم على وظيفة. يرجى تزويدي بالخطوات التالية.",
    },

  },
};

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function normalizeJob(row) {
  return {
    id: String(row?.id ?? ""),
    title: String(row?.title ?? ""),
    department: row?.department ? String(row.department) : "",
    locationCountry: row?.location_country ? String(row.location_country) : "",
    locationCity: row?.location_city ? String(row.location_city) : "",
    employmentType: row?.employment_type ? String(row.employment_type) : "",
    jobDescriptionHtml: String(row?.job_description_html ?? ""),
    publishedAt: row?.published_at ? String(row.published_at) : "",
    createdAt: row?.created_at ? String(row.created_at) : "",
  };
}

export default function Careers() {
  const { lang } = useOutletContext();
  const t = UI_COPY[lang] || UI_COPY.en;

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  // IMPORTANT: do NOT auto-select. User must explicitly choose the job.
  const [selectedJobId, setSelectedJobId] = useState("");

  const [expandedJobs, setExpandedJobs] = useState({});
  const [page, setPage] = useState(1);

  const [applyErr, setApplyErr] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyFormRef = useRef(null);

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find((j) => String(j.id) === String(selectedJobId)) || null;
  }, [jobs, selectedJobId]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil((jobs?.length || 0) / JOBS_PER_PAGE));
  }, [jobs]);

  const pageJobs = useMemo(() => {
    const start = (page - 1) * JOBS_PER_PAGE;
    return jobs.slice(start, start + JOBS_PER_PAGE);
  }, [jobs, page]);

  const paginationSummary = useMemo(() => {
    const total = jobs.length;
    if (!total) return "";
    const start = (page - 1) * JOBS_PER_PAGE + 1;
    const end = Math.min(page * JOBS_PER_PAGE, total);
    return `${t.pagination.showing} ${start}-${end} ${t.pagination.of} ${total} ${t.pagination.jobs}`;
  }, [jobs.length, page, t]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setJobsLoading(true);
      setJobsError("");
      try {
        const res = await fetch("/api/recruitment?resource=jobs", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || data?.detail || t.loadError);
        }

        const rows = Array.isArray(data.jobs) ? data.jobs : [];
        const normalized = rows.map(normalizeJob).filter((j) => j.id && j.title);

        if (!alive) return;
        setJobs(normalized);
        setPage(1);
      } catch (err) {
        if (!alive) return;
        setJobs([]);
        setJobsError(String(err?.message || t.loadError));
      } finally {
        if (!alive) return;
        setJobsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t.loadError]);

  function toggleExpanded(jobId) {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  }

  function handleSelectJob(jobId) {
    setSelectedJobId(String(jobId));
    setApplyErr("");
    setApplyMsg("");

    const el = applyFormRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function gotoPage(nextPage) {
    const n = Number(nextPage);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, 1), pageCount);
    setPage(clamped);
    // optional: collapse descriptions when paging
    // setExpandedJobs({});
  }

  async function onApply(e) {
    e.preventDefault();
    setApplyErr("");
    setApplyMsg("");

    if (!selectedJobId) {
      setApplyErr(t.validationError);
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    // Ensure jobId is present and matches selection
    form.set("jobId", String(selectedJobId));

    const requiredKeys = [
      "jobId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "educationLevel",
      "country",
      "city",
      "cv",
    ];

    const missing = requiredKeys.some((k) => {
      const v = form.get(k);
      if (k === "cv") {
        return !(v && typeof v === "object" && v.size > 0);
      }
      return !String(v || "").trim();
    });

    if (missing) {
      setApplyErr(t.validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recruitment?resource=apply", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || "Failed to submit application");
      }

      if (data?.sheetSync?.ok === false) {
        throw new Error(data?.sheetSync?.error || "Saved, but Google Sheet sync failed");
      }

      setApplyMsg(t.success);
      formEl?.reset();
      setSelectedJobId("");
    } catch (err) {
      setApplyErr(String(err?.message || "Failed to submit application"));
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappHref = useMemo(() => buildWhatsAppLink(t.whatsapp.message), [t.whatsapp.message]);

  return (
    <div className="page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="page-head">
        <h1>{t.title}</h1>
        <p className="muted">{t.subtitle}</p>
      </div>

      <div className="careers-grid">
        {/* JOBS */}
        <section className="jobs card">
          <div className="card-pad">
            <h2 style={{ margin: 0 }}>{lang === "ar" ? "الوظائف المفتوحة" : "Open vacancies"}</h2>
            {paginationSummary ? <div className="muted small" style={{ marginTop: 6 }}>{paginationSummary}</div> : null}
          </div>

          <div className="job-list">
            {jobsLoading ? (
              <div className="card-pad">
                <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
              </div>
            ) : jobsError ? (
              <div className="card-pad">
                <p className="muted" style={{ margin: 0 }}>{jobsError}</p>
              </div>
            ) : !jobs.length ? (
              <div className="card-pad">
                <p className="muted" style={{ margin: 0 }}>{t.empty}</p>
              </div>
            ) : (
              <>
                {pageJobs.map((job) => {
                  const fullText = stripHtml(job.jobDescriptionHtml);
                  const isLong = fullText.split(/\s+/).filter(Boolean).length > PREVIEW_WORDS;
                  const isExpanded = !!expandedJobs[job.id];
                  const preview = truncateWords(fullText, PREVIEW_WORDS);

                  const meta = [
                    job.department,
                    job.locationCity,
                    job.locationCountry,
                    job.employmentType,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <article key={job.id} className="job">
                      <div className="job-top">
                        <div>
                          <div className="job-title">{job.title}</div>
                          {meta ? <div className="job-meta">{meta}</div> : null}
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleSelectJob(job.id)}
                        >
                          {t.selectJob}
                        </button>
                      </div>

                      <div className="job-desc">
                        {isLong && !isExpanded ? (
                          <p style={{ margin: 0 }}>{preview}</p>
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: job.jobDescriptionHtml || `<p>${preview}</p>`,
                            }}
                          />
                        )}
                      </div>

                      {isLong ? (
                        <button
                          type="button"
                          className="readmore"
                          onClick={() => toggleExpanded(job.id)}
                        >
                          {isExpanded ? t.readLess : t.readMore}
                        </button>
                      ) : null}
                    </article>
                  );
                })}

                {/* Pagination */}
                {jobs.length > JOBS_PER_PAGE ? (
                  <div className="card-pad">
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => gotoPage(page - 1)}
                        disabled={page <= 1}
                      >
                        {t.pagination.prev}
                      </button>

                      <div className="spacer" />

                      <div className="muted small" style={{ alignSelf: "center" }}>
                        {t.pagination.page} {page} {t.pagination.of} {pageCount}
                      </div>

                      <div className="spacer" />

                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => gotoPage(page + 1)}
                        disabled={page >= pageCount}
                      >
                        {t.pagination.next}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        {/* APPLY */}
        <section className="apply card" ref={applyFormRef}>
          <div className="apply-head">
            <h2 style={{ margin: 0 }}>{t.applyTitle}</h2>
            <p className="muted" style={{ margin: 0 }}>{t.applySubtitle}</p>
          </div>

          <div className="card-pad">
            <form onSubmit={onApply}>
              {/* Job selector */}
              <div className="field">
                <label className="muted small">{t.selectedJob}</label>
                <select
                  className="input"
                  name="jobId"
                  value={selectedJobId || ""}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    setApplyErr("");
                    setApplyMsg("");
                  }}
                >
                  <option value="">{t.selectPlaceholder}</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>

                {!selectedJobId ? (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {t.selectHint}
                  </div>
                ) : selectedJob ? (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {[selectedJob.department, selectedJob.locationCity, selectedJob.locationCountry, selectedJob.employmentType]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="muted small">{t.fields.firstName}</label>
                  <input className="input" name="firstName" required />
                </div>
                <div className="field">
                  <label className="muted small">{t.fields.lastName}</label>
                  <input className="input" name="lastName" required />
                </div>
                <div className="field">
                  <label className="muted small">{t.fields.email}</label>
                  <input className="input" type="email" name="email" required />
                </div>
                <div className="field">
                  <label className="muted small">{t.fields.phone}</label>
                  <input className="input" name="phone" required />
                </div>

                <div className="field">
                  <label className="muted small">{t.fields.education}</label>
                  <select className="input" name="educationLevel" defaultValue="" required>
                    <option value="" disabled>
                      {t.fields.education}
                    </option>
                    {t.educationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="muted small">{t.fields.country}</label>
                  <input className="input" name="country" required />
                </div>

                <div className="field">
                  <label className="muted small">{t.fields.city}</label>
                  <input className="input" name="city" required />
                </div>

                <div className="field">
                  <label className="muted small">{t.fields.cv}</label>
                  <input
                    className="input"
                    name="cv"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,image/*"
                  />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted small">{t.fields.cover}</label>
                  <input
                    className="input"
                    name="cover"
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                  />
                </div>
              </div>

              <div className="row" style={{ marginTop: 12 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !selectedJobId}
                >
                  {submitting ? t.submitting : t.submit}
                </button>

                <div className="spacer" />

                <Link className="btn btn-ghost" to="/quality">
                  {t.links.quality}
                </Link>
                <Link className="btn btn-ghost" to="/contact">
                  {t.links.contact}
                </Link>
              </div>

              {applyErr ? (
                <div className="banner" style={{ marginTop: 10 }}>
                  {applyErr}
                </div>
              ) : null}

              {applyMsg ? (
                <div className="mkt-success" style={{ marginTop: 10 }}>
                  {applyMsg}
                </div>
              ) : null}
            </form>

            <div className="hr" />

            <h3 style={{ marginTop: 0 }}>{t.whatsapp.title}</h3>
            <p className="muted">{t.whatsapp.body}</p>
            <a className="btn" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              {t.whatsapp.cta}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
