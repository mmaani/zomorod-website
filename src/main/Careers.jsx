// src/main/Careers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

const COPY = {
  en: {
    title: "Careers",
    subtitle: "Open vacancies published from CRM. Select a role and apply below.",
    jobsLoading: "Loading opportunities...",
    jobsEmpty: "No openings announced at the moment.",
    selectJob: "Select",
    selectedJobLabel: "Selected job",
    applyTitle: "Apply now",
    applyHint:
      "Fill in the form and upload your CV. We will contact shortlisted candidates.",
    submitting: "Submitting...",
    apply: "Submit application",
    applySuccess: "Your application has been submitted successfully.",
    applyError:
      "Please select a job and fill all required fields before submitting.",
    readMore: "Read more",
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
      cover: "Cover letter (optional)",
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
    cvHint: "Accepted: PDF, DOC, DOCX",
  },

  ar: {
    title: "الوظائف",
    subtitle: "الوظائف المفتوحة منشورة من CRM. اختر الوظيفة ثم قدّم أدناه.",
    jobsLoading: "جاري تحميل الفرص...",
    jobsEmpty: "لا توجد وظائف معلنة حالياً.",
    selectJob: "اختيار",
    selectedJobLabel: "الوظيفة المختارة",
    applyTitle: "قدّم الآن",
    applyHint: "يرجى تعبئة النموذج ورفع السيرة الذاتية. سنتواصل مع المرشحين المؤهلين.",
    submitting: "جاري الإرسال...",
    apply: "إرسال الطلب",
    applySuccess: "تم إرسال طلبك بنجاح.",
    applyError: "يرجى اختيار وظيفة ثم تعبئة جميع الحقول المطلوبة.",
    readMore: "اقرأ المزيد",
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
      cover: "رسالة تغطية (اختياري)",
    },

    educationOptions: ["ثانوي", "دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "أخرى"],
    dash: "—",
    cvHint: "الصيغ المقبولة: PDF, DOC, DOCX",
  },
};

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export default function Careers() {
  const ctx = useOutletContext?.() || {};
  const lang = ctx.lang || "en";
  const t = useMemo(() => COPY[lang] || COPY.en, [lang]);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

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

  useEffect(() => {
    let alive = true;

    (async () => {
      setJobsLoading(true);
      try {
        const res = await fetch("/api/recruitment?resource=jobs");
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        if (res.ok && data.ok) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        } else {
          setJobs([]);
        }
      } catch {
        if (!alive) return;
        setJobs([]);
      } finally {
        if (!alive) return;
        setJobsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
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

    // For FormData, file inputs exist as File objects (or empty).
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
      if (data?.sheetSync?.ok === false) {
        throw new Error(data?.sheetSync?.error || "Saved, but Google Sheet sync failed");
      }

      setApplyMsg(t.applySuccess);
      formEl.reset();
      setSelectedJobId("");
    } catch (err) {
      setApplyErr(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
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
              ) : jobs.length === 0 ? (
                <div className="muted">{t.jobsEmpty}</div>
              ) : (
                <div className="mkt-jobs-list">
                  {jobs.map((job) => {
                    const plain = stripHtml(job.description || "");
                    const expanded = !!expandedJobs[job.id];
                    const snippet = expanded ? plain : truncateWords(plain, 28);
                    const isSelected = String(job.id) === String(selectedJobId);

                    return (
                      <div
                        key={job.id}
                        className={`mkt-job-card ${isSelected ? "is-selected" : ""}`}
                      >
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900 }}>
                              <bdi>{job.title}</bdi>
                            </div>
                            <div className="small" style={{ marginTop: 4 }}>
                              <bdi>
                                {[job.country, job.city, job.type].filter(Boolean).join(" • ")}
                              </bdi>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="mkt-inline-btn"
                            onClick={() => handleSelectJob(job.id)}
                          >
                            {t.selectJob}
                          </button>
                        </div>

                        {snippet ? (
                          <div className="mkt-job-description" style={{ marginTop: 6 }}>
                            <bdi>{snippet}</bdi>
                          </div>
                        ) : null}

                        {plain && plain.split(/\s+/).filter(Boolean).length > 28 ? (
                          <button
                            type="button"
                            className="mkt-readmore"
                            onClick={() =>
                              setExpandedJobs((prev) => ({
                                ...prev,
                                [job.id]: !prev[job.id],
                              }))
                            }
                            style={{
                              marginTop: 6,
                              width: "fit-content",
                              background: "transparent",
                              border: "none",
                              color: "var(--text)",
                              opacity: 0.8,
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            {expanded ? t.readLess : t.readMore}
                          </button>
                        ) : null}
                      </div>
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
                  <bdi>{selectedJob ? selectedJob.title : t.dash}</bdi>
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
                    accept=".pdf,.doc,.docx"
                    required
                  />
                  <div className="small" style={{ marginTop: 6 }}>
                    {t.cvHint}
                  </div>
                </div>
              </div>

              <div className="field">
                <label>{t.fields.cover}</label>
                <textarea className="input" name="coverLetter" rows={4} />
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? t.submitting : t.apply}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
