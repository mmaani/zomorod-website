import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const COPY = {
  en: {
    dir: "ltr",
    langLabel: "عربي",
    brandName: "Zomorod Medical Supplies LLC",
    tagline: "A trusted distribution partner for compliant medical consumables and dependable supply operations in Jordan and Syria.",
    ctaStaff: "Staff Login",
    ctaWhatsapp: "WhatsApp",
        metrics: [
      { value: "Jordan & Syria", label: "Coverage" },
      { value: "Hospitals to retail", label: "Client segments" },
      { value: "Quality-focused", label: "Sourcing approach" },
    ],
    tabs: { about: "Company", products: "Products", careers: "Careers" },
    aboutTitle: "Professional medical supply solutions",
    aboutText: "Based in Amman, Zomorod supports hospitals, clinics, laboratories, and distributors with quality-focused sourcing and documented compliance.",
    aboutPoints: ["Regulatory-ready documentation", "Traceable sourcing", "Responsive local support"],
    servicesTitle: "Our services",
    services: [
      "Medical consumables procurement and supply planning",
      "Support for tenders and institutional sourcing requirements",
      "Order fulfillment coordination and after-sales follow-up",
      "Product and document traceability for compliance workflows",
    ],
    productsTitle: "Our product lines",
    sectorsTitle: "Who we serve",
    sectors: ["Hospitals", "Clinics", "Laboratories", "Pharmacies & distributors"],
    careersTitle: "Recruitment announcements",
    careersSubtitle: "Open vacancies published from CRM. Apply directly below.",
    jobsLoading: "Loading opportunities...",
    jobsEmpty: "No openings announced at the moment.",
    selectJob: "Select this job",
    apply: "Apply now",
    submitting: "Submitting...",
    applySuccess: "Your application has been submitted successfully.",
    applyError: "Please fill all required fields.",
    readMore: "Read more",
    readLess: "Show less",
    educationPlaceholder: "Education level",
    cv: "CV (required)",
    contactTitle: "Contact",
    contactEmail: "Email",
    contactPhone: "Phone",
    contactAddress: "Address",
    addressValue: "Amman, Jordan",
  
  },
  ar: {
    dir: "rtl",
    langLabel: "EN",
    brandName: "شركة زمرد للمستلزمات الطبية ذ.م.م",
    tagline: "شريك موثوق لتوريد المستلزمات الطبية المتوافقة مع المتطلبات التشغيلية والتنظيمية في الأردن وسوريا.",
    ctaStaff: "دخول الموظفين",
    ctaWhatsapp: "واتساب",
    metrics: [
      { value: "الأردن وسوريا", label: "نطاق التغطية" },
      { value: "من المستشفيات إلى التجزئة", label: "شرائح العملاء" },
      { value: "تركيز على الجودة", label: "منهجية التوريد" },
    ],
    tabs: { about: "الشركة", products: "المنتجات", careers: "الوظائف" },
    aboutTitle: "حلول احترافية للمستلزمات الطبية",
  aboutText: "من مقرّنا في عمّان، ندعم المستشفيات والعيادات والمختبرات والموزعين عبر توريد موثوق ونهج يركز على الجودة والامتثال.",
    aboutPoints: ["وثائق جاهزة للمتطلبات التنظيمية", "توريد قابل للتتبع", "دعم محلي سريع"],
    servicesTitle: "خدماتنا",
    services: [
      "توريد المستهلكات الطبية وتخطيط احتياجات الإمداد",
      "دعم المناقصات ومتطلبات الشراء المؤسسي",
      "تنسيق تنفيذ الطلبات والمتابعة بعد البيع",
      "إتاحة تتبع المنتجات والوثائق ضمن مسارات الامتثال",
    ],
    productsTitle: "خطوط منتجاتنا",
    sectorsTitle: "الجهات التي نخدمها",
    sectors: ["المستشفيات", "العيادات", "المختبرات", "الصيدليات والموزعون"],
    careersTitle: "إعلانات التوظيف",
    careersSubtitle: "الوظائف المفتوحة المنشورة من CRM. يمكن التقديم مباشرة.",
    jobsLoading: "جاري تحميل الفرص...",
    jobsEmpty: "لا توجد وظائف معلنة حالياً.",
    selectJob: "اختيار هذه الوظيفة",
    apply: "قدّم الآن",
    submitting: "جاري الإرسال...",
    applySuccess: "تم إرسال طلبك بنجاح.",
    applyError: "يرجى تعبئة جميع الحقول المطلوبة.",
    readMore: "اقرأ المزيد",
    readLess: "عرض أقل",
    educationPlaceholder: "المؤهل العلمي",
    cv: "السيرة الذاتية (مطلوب)",
    cover: "رسالة تغطية (اختياري)",
    contactTitle: "التواصل",
    contactEmail: "البريد الإلكتروني",
    contactPhone: "الهاتف",
    contactAddress: "العنوان",
    addressValue: "عمّان، الأردن",
  },
};

const PRODUCT_CARDS = {
  en: [
    { title: "PPE", body: "Masks, gloves, gowns, and essential protective equipment for clinical environments." },
    { title: "Medical Consumables", body: "Daily sterile supplies, procedure kits, infusion and wound-care consumables." },
    { title: "Devices & Accessories", body: "Selected medical devices and accessories for reliable daily operation." },
    { title: "Laboratory Supplies", body: "Routine lab disposables and supporting products for testing workflows." },
    { title: "Infection Control", body: "Products that support hygiene, disinfection, and safer patient environments." },
    { title: "Custom Sourcing", body: "Need a specific item? We support institutional and project-based sourcing requests." },
  ],
  ar: [
    { title: "معدات الوقاية", body: "كمامات وقفازات وأرواب ومستلزمات الوقاية الأساسية للبيئات الطبية." },
    { title: "المستهلكات الطبية", body: "مستلزمات معقمة يومية وأطقم إجراءات ومستلزمات التسريب والعناية بالجروح." },
    { title: "الأجهزة والملحقات", body: "أجهزة وملحقات طبية مختارة للاستخدام العملي اليومي." },
    { title: "مستلزمات المختبر", body: "مستهلكات مخبرية روتينية ومنتجات داعمة لسير العمل التحليلي." },
    { title: "مكافحة العدوى", body: "منتجات تدعم النظافة والتعقيم وبيئة رعاية أكثر أماناً." },
    { title: "توريد حسب الطلب", body: "هل تحتاج منتجاً محدداً؟ نوفر دعماً لطلبات التوريد المؤسسي والمشاريع." },
  ],
};
const EDUCATION_LEVEL_OPTIONS = {
  en: ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"],
  ar: ["ثانوي", "دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "أخرى"],
};

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}


export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("about");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});
  const t = useMemo(() => COPY[lang], [lang]);

  useEffect(() => {
      (async () => {
      setJobsLoading(true);
      try {
        const res = await fetch("/api/recruitment?resource=jobs");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const items = Array.isArray(data.jobs) ? data.jobs : [];
          setJobs(items);
          if (!selectedJobId && items.length) setSelectedJobId(String(items[0].id));
        }
      } finally {
        setJobsLoading(false);
      }
    })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApply(e) {
    e.preventDefault();
    setApplyErr("");
    setApplyMsg("");
    const form = new FormData(e.currentTarget);
    if (!["jobId", "firstName", "lastName", "email", "phone", "educationLevel", "country", "city"].every((k) => form.get(k))) {
      setApplyErr(t.applyError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/recruitment?resource=apply", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to submit application");
      setApplyMsg(t.applySuccess);
      e.currentTarget.reset();
    } catch (err) {
      setApplyErr(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mkt-page" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-hero-top">
          <img className="mkt-logo" src="/logo.png" alt="Zomorod logo" />
          <button type="button" className="btn btn-ghost mkt-lang" onClick={() => setLang((s) => (s === "en" ? "ar" : "en"))}>{t.langLabel}</button>
        </div>
        <h1 className="mkt-title">{t.brandName}</h1>
        <p className="mkt-tagline">{t.tagline}</p>
        <div className="mkt-cta-row">
          <a className="btn mkt-cta" href="https://api.whatsapp.com/send?phone=962791752686" target="_blank" rel="noopener noreferrer">{t.ctaWhatsapp}</a>
          <Link to="/login" className="btn btn-primary mkt-cta">{t.ctaStaff}</Link>
        </div>
        <div className="mkt-hero-metrics">
          {t.metrics.map((m) => (
            <div className="mkt-metric" key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>
          ))}
        </div>
      </header>

      <section className="mkt-section card">
        <div className="mkt-tabs" role="tablist" aria-label="Main sections">
          {Object.entries(t.tabs).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`mkt-tab ${activeTab === key ? "is-active" : ""}`} onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>
              {activeTab === "about" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.aboutTitle}</h2>
            <p className="mkt-p">{t.aboutText}</p>
            <ul className="mkt-list">
              {t.aboutPoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        ) : null}
        {activeTab === "products" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.productsTitle}</h2>
            <div className="mkt-grid">
              {PRODUCT_CARDS[lang].map((card) => (
                <article className="mkt-card" key={card.title}>
                  <div className="mkt-card-title">{card.title}</div>
                  <p className="mkt-card-body">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

 {activeTab === "careers" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.careersTitle}</h2>
            <p className="mkt-p">{t.careersSubtitle}</p>
            {jobsLoading ? <p className="mkt-p">{t.jobsLoading}</p> : (
              <div className="mkt-jobs-list">
                {jobs.map((job) => (
                  <article key={job.id} className="mkt-job-card">
                    <div className="mkt-card-title">{job.title}</div>
                    <p className="mkt-card-body">{[job.department, job.location_city, job.location_country, job.employment_type].filter(Boolean).join(" • ")}</p>
                    {(() => {
                      const fullText = stripHtml(job.job_description_html);
                      const isLong = fullText.split(/\s+/).filter(Boolean).length > 50;
                      const isExpanded = !!expandedJobs[job.id];
                      return (
                        <>
                          <div className="mkt-job-description">
                            {isLong && !isExpanded ? <p>{truncateWords(fullText, 50)}</p> : <div dangerouslySetInnerHTML={{ __html: job.job_description_html }} />}
                          </div>
                          {isLong ? (
                            <button
                              type="button"
                              className="mkt-inline-btn"
                              onClick={() => setExpandedJobs((prev) => ({ ...prev, [job.id]: !prev[job.id] }))}
                            >
                              {isExpanded ? t.readLess : t.readMore}
                            </button>
                          ) : null}
                        </>
                      );
                    })()}
                    <button className="btn btn-primary" type="button" onClick={() => setSelectedJobId(String(job.id))}>{t.selectJob}</button>
                  </article>
                ))}
                {!jobs.length ? <p className="mkt-p">{t.jobsEmpty}</p> : null}
              </div>
            )}

            {jobs.length ? (
              <form className="mkt-apply-form" onSubmit={onApply}>
                <input type="hidden" name="jobId" value={selectedJobId || ""} />
                <div className="grid grid-2">
                  <input className="input" name="firstName" placeholder={lang === "ar" ? "الاسم الأول" : "First name"} required />
                  <input className="input" name="lastName" placeholder={lang === "ar" ? "اسم العائلة" : "Last name"} required />
                  <input className="input" type="email" name="email" placeholder="Email" required />
                  <input className="input" name="phone" placeholder={lang === "ar" ? "رقم الهاتف" : "Phone number"} required />
                  <select className="input" name="educationLevel" defaultValue="" required>
                    <option value="" disabled>{t.educationPlaceholder}</option>
                    {EDUCATION_LEVEL_OPTIONS[lang].map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <input className="input" name="country" placeholder={lang === "ar" ? "الدولة" : "Country"} required />
                  <input className="input" name="city" placeholder={lang === "ar" ? "المدينة" : "City"} required />
                </div>
                <div className="grid grid-2" style={{ marginTop: 10 }}>
                  <label>{t.cv}<input className="input" name="cv" type="file" required /></label>
                  <label>{t.cover}<input className="input" name="cover" type="file" /></label>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? t.submitting : t.apply}</button>
                {applyErr ? <div className="banner">{applyErr}</div> : null}
                {applyMsg ? <div className="mkt-success">{applyMsg}</div> : null}
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="mkt-section card">
        
            <div className="grid grid-2">
          <article>
            <h2 className="mkt-h2">{t.servicesTitle}</h2>
            <ul className="mkt-list">
              {t.services.map((service) => <li key={service}>{service}</li>)}
            </ul>
          </article>
          <article>
            <h2 className="mkt-h2">{t.sectorsTitle}</h2>
            <div className="mkt-grid mkt-grid-compact">
              {t.sectors.map((sector) => (
                <div key={sector} className="mkt-card"><div className="mkt-card-title">{sector}</div></div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.contactTitle}</h2>
        <div className="mkt-contact">
          <div className="mkt-contact-row"><span className="mkt-contact-label">{t.contactEmail}</span><a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a></div>
          <div className="mkt-contact-row"><span className="mkt-contact-label">{t.contactPhone}</span><a href="tel:+962791752686">+962 79 175 2686</a></div>
          <div className="mkt-contact-row"><span className="mkt-contact-label">{t.contactAddress}</span><span>{t.addressValue}</span></div>
        </div>
      </section>
    </main>
  );
}