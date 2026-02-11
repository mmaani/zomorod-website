// src/main/Careers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

const PREVIEW_WORDS = 28; // 25–30 words as requested

const COPY = {
  en: {
    title: "Careers",
    subtitle: "Open vacancies published from CRM. Select a vacancy and apply below.",
    jobsLoading: "Loading opportunities...",
    jobsEmpty: "No openings announced at the moment.",
    jobsErrorTitle: "Couldn’t load openings.",
    retry: "Retry",

    selectJob: "Select this job",
    selectedJobLabel: "Selected job",
    applyTitle: "Apply now",
    applyHint: "Fill in the form and upload your CV. Optional: upload a cover letter file.",
    submitting: "Submitting...",
    apply: "Submit application",
    applySuccess: "Your application has been submitted successfully.",
    applySuccessWithWarning: "Your application was saved. (Note: Sheet sync issue on our side.)",
    applyError: "Please select a job and fill all required fields before submitting.",
    readMore: "Show more",
    readLess: "Show less",

    fields: {
      firstName: "First Name*",
      lastName: "Last Name*",
      email: "Email*",
      phone: "Phone*",
      education: "Education level*",
      country: "Country*",
      city: "City*",
      cv: "CV (required)*",
      cover: "Cover letter file (optional)",
    },

    educationOptions: [
      "High School",
      "Diploma",
      "Bachelor's Degree",
      "Master's Degree",
      "PhD",
      "Other",
    ],
    dash: "—",
    cvHint: "Accepted: PDF, DOC, DOCX, images (max 15 MB)",
    coverHint: "Accepted: PDF, DOC, DOCX, images (max 15 MB)",
    pickJobHint: "Please select a vacancy above.",
  },

  ar: {
    title: "الوظائف",
    subtitle: "الوظائف المفتوحة منشورة من CRM. اختر الوظيفة ثم قدّم أدناه.",
    jobsLoading: "جاري تحميل الفرص...",
    jobsEmpty: "لا توجد وظائف معلنة حالياً.",
    jobsErrorTitle: "تعذر تحميل الوظائف.",
    retry: "إعادة المحاولة",

    selectJob: "اختيار هذه الوظيفة",
    selectedJobLabel: "الوظيفة المختارة",
    applyTitle: "قدّم الآن",
    applyHint: "يرجى تعبئة النموذج ورفع السيرة الذاتية. اختياري: رفع ملف رسالة تغطية.",
    submitting: "جاري الإرسال...",
    apply: "إرسال الطلب",
    applySuccess: "تم إرسال طلبك بنجاح.",
    applySuccessWithWarning: "تم حفظ طلبك. (ملاحظة: مشكلة في مزامنة Google Sheet لدينا.)",
    applyError: "يرجى اختيار وظيفة ثم تعبئة جميع الحقول المطلوبة.",
    readMore: "عرض المزيد",
    readLess: "عرض أقل",

    fields: {
      firstName: "الاسم الأول*",
      lastName: "اسم العائلة*",
      email: "البريد الإلكتروني*",
      phone: "الهاتف*",
      education: "المؤهل العلمي*",
      country: "الدولة*",
      city: "المدينة*",
      cv: "السيرة الذاتية (مطلوب)*",
      cover: "ملف رسالة تغطية (اختياري)",
    },

    educationOptions: ["ثانوي", "دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "أخرى"],
    dash: "—",
    cvHint: "الصيغ المقبولة: PDF, DOC, DOCX أو صور (حد أقصى 15MB)",
    coverHint: "الصيغ المقبولة: PDF, DOC, DOCX أو صور (حد أقصى 15MB)",
    pickJobHint: "يرجى اختيار وظيفة من الأعلى.",
  },
};

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text, truncated: false };
  return { text: `${words.slice(0, maxWords).join(" ")}...`, truncated: true };
}

export default function Careers() {
  const ctx = useOutletContext() || {};
  const lang = ctx.lang || "en";
  const t = useMemo(() => COPY[lang] || COPY.en, [lang]);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  // IMPORTANT: do NOT auto-select. User must explicitly choose the job.
  const [selectedJobId, setSelectedJobId] = useState("");

  const [expandedJobs, setExpandedJobs] = useState({});

  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyFormRef = useRef(null);

  const selectedJob = useMemo(() => {
    const id = Number(selectedJobId || 0);
    return jobs.find((j) => Number(j.id) === id) || null;
  }, [jobs, selectedJobId]);

  async function loadJobs() {
    setJobsLoading(true);
    setJobsError("");
    try {
      const res = await fetch("/api/recruitment?resource=jobs", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
      }

      const list = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(list);
    } catch (err) {
      setJobs([]);
      setJobsError(String(err?.message || err || "Failed to load jobs"));
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectJob(jobId) {
    setSelectedJobId(String(jobId));
    setApplyErr("");
    setApplyMsg("");

    const el = applyFormRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function onApply(e) {
    e.preventDefault();
    setApplyErr("");
    setApplyMsg("");

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    if (!selectedJobId) {
      setApplyErr(t.applyError);
      return;
    }

    form.set("jobId", selectedJobId);

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

    const hasAll = requiredKeys.every((k) => {
      const v = form.get(k);
      if (k === "cv") return v instanceof File && v.size > 0;
      return !!String(v || "").trim();
    });

    if (!hasAll) {
      setApplyErr(t.applyError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recruitment?resource=apply", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || "Failed to submit application");
      }

      // Important: don’t block applicant if Sheets sync fails (application is saved in DB)
      if (data?.sheetSync?.ok === false) {
        setApplyMsg(t.applySuccessWithWarning);
      } else {
        setApplyMsg(t.applySuccess);
      }

      formEl.reset();
      setSelectedJobId("");
    } catch (err) {
      setApplyErr(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {t.title}
          </h1>
          <p className="p" style={{ margin: 0 }}>
            {t.subtitle}
          </p>
        </div>

        <div className="hr" />

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          {/* Jobs list */}
          <div className="card" style={{ background: "rgba(255,255,255,.03)", boxShadow: "none" }}>
            <div className="card-pad">
              {jobsLoading ? (
                <div className="muted">{t.jobsLoading}</div>
              ) : jobsError ? (
                <div className="banner" style={{ margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{t.jobsErrorTitle}</div>
                      <div className="small" style={{ marginTop: 4, opacity: 0.9 }}>
                        <bdi>{jobsError}</bdi>
                      </div>
                    </div>
                    <button className="btn btn-ghost" type="button" onClick={loadJobs}>
                      {t.retry}
                    </button>
                  </div>
                </div>
              ) : jobs.length === 0 ? (
                <div className="muted">{t.jobsEmpty}</div>
              ) : (
                <div className="mkt-jobs-list">
                  {jobs.map((job) => {
                    const html = job.job_description_html || "";
                    const plain = stripHtml(html);
                    const { text: previewText, truncated } = truncateWords(plain, PREVIEW_WORDS);
                    const expanded = !!expandedJobs[job.id];
                    const isSelected = String(job.id) === String(selectedJobId);

                    const meta = [
                      job.department,
                      job.location_city,
                      job.location_country,
                      job.employment_type,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <article
                        key={job.id}
                        className={`mkt-job-card ${isSelected ? "is-selected" : ""}`}
                      >
                        <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900 }}>
                              <bdi>{job.title}</bdi>
                            </div>
                            {meta ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                <bdi>{meta}</bdi>
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            className="mkt-inline-btn"
                            onClick={() => handleSelectJob(job.id)}
                          >
                            {t.selectJob}
                          </button>
                        </div>

                        {/* Description: preview 25–30 words, toggle to full HTML */}
                        <div className="mkt-job-description" style={{ marginTop: 8 }}>
                          {expanded ? (
                            <div dangerouslySetInnerHTML={{ __html: html }} />
                          ) : (
                            <p style={{ margin: 0 }}>
                              <bdi>{previewText}</bdi>
                            </p>
                          )}
                        </div>

                        {truncated ? (
                          <button
                            type="button"
                            className="mkt-readmore"
                            onClick={() =>
                              setExpandedJobs((prev) => ({ ...prev, [job.id]: !prev[job.id] }))
                            }
                            style={{
                              marginTop: 8,
                              width: "fit-content",
                              background: "transparent",
                              border: "none",
                              color: "var(--text)",
                              opacity: 0.85,
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            {expanded ? t.readLess : t.readMore}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Apply form */}
          <div ref={applyFormRef} className="card page-section">
            <div className="page-head">
              <div className="h2" style={{ fontSize: 18, margin: 0 }}>
                {t.applyTitle}
              </div>
              <div className="p" style={{ margin: 0 }}>
                {t.applyHint}
              </div>
            </div>

            <div className="hr" />

            <div className="mkt-selected-job">
              <div className="mkt-selected-job-label">{t.selectedJobLabel}:</div>
              <div className="mkt-selected-job-value">
                <strong>
                  <bdi>{selectedJob ? selectedJob.title : t.pickJobHint}</bdi>
                </strong>
              </div>
            </div>

            {applyMsg ? <div className="mkt-success">{applyMsg}</div> : null}
            {applyErr ? (
              <div className="banner" style={{ marginTop: 10 }}>
                {applyErr}
              </div>
            ) : null}

            <form className="mkt-apply-form" onSubmit={onApply}>
              <div className="grid grid-2">
                <div className="field">
                  <label>{t.fields.firstName}</label>
                  <input className="input" name="firstName" required />
                </div>
                <div className="field">
                  <label>{t.fields.lastName}</label>
                  <input className="input" name="lastName" required />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>{t.fields.email}</label>
                  <input className="input" type="email" name="email" required />
                </div>
                <div className="field">
                  <label>{t.fields.phone}</label>
                  <input className="input" name="phone" required />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>{t.fields.education}</label>
                  <select name="educationLevel" required defaultValue="">
                    <option value="" disabled>
                      {t.dash}
                    </option>
                    {t.educationOptions.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{t.fields.country}</label>
                  <input className="input" name="country" required />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>{t.fields.city}</label>
                  <input className="input" name="city" required />
                </div>

                <div className="field">
                  <label>{t.fields.cv}</label>
                  <input
                    className="input"
                    type="file"
                    name="cv"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff"
                    required
                  />
                  <div className="small" style={{ marginTop: 6 }}>
                    {t.cvHint}
                  </div>
                </div>
              </div>

              <div className="field">
                <label>{t.fields.cover}</label>
                <input
                  className="input"
                  type="file"
                  name="cover"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff"
                />
                <div className="small" style={{ marginTop: 6 }}>
                  {t.coverHint}
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting || !selectedJobId}>
                {submitting ? t.submitting : t.apply}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
