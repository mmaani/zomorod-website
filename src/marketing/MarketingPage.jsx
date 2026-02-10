// MarketingPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "962791752686";

function buildWhatsAppLink(message) {
  const text = encodeURIComponent(String(message || ""));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

const COPY = {
  en: {
    dir: "ltr",
    langLabel: "عربي",

    brandName: "Zomorod Medical Supplies LLC",
    tagline:
      "Compliance-aware supply and consistent specifications for pharmacies and resellers — Jordan & Syria.",
    responseSla: "Quote response within 48 business hours.",

    ctaStaff: "Staff Login",
    ctaWhatsapp: "WhatsApp",
    ctaQuote: "Request a Quote",
    ctaQuoteHint: "Jump to the quote section",

    heroBullets: [
      "Quote-ready supply for repeat orders (consistent specs & packaging).",
      "Documentation guidance per destination (requirements vary by Jordan/Syria import rules).",
      "Fast coordination via WhatsApp for availability, alternatives, and lead time.",
    ],
    trustBadges: ["Docs support (as applicable)", "Lot/Batch (when available)", "Clear lead times"],

    metrics: [
      { value: "Jordan & Syria", label: "Coverage" },
      { value: "Pharmacies & resellers", label: "Primary buyers" },
      { value: "Consistency-first", label: "Supply approach" },
    ],

    tabs: { about: "Company", products: "Products", careers: "Careers" },

    aboutTitle: "Professional medical supply solutions",
    aboutText:
      "Based in Amman, Zomorod supports pharmacies, clinics, laboratories, and resellers with documented, compliance-aware sourcing and dependable supply execution.",
    aboutPoints: [
      "Reliable supply with consistent specs",
      "Clear lead times and practical communication",
      "Documentation guidance as applicable (requirements vary by destination)",
    ],

    trustTitle: "Trust & operating standards",
    trustPoints: [
      {
        k: "Buyer fit",
        v: "Built for professional buyers (pharmacies, resellers, clinics, labs).",
      },
      {
        k: "Consistency",
        v: "We prioritize consistency of specs and packaging across repeat orders.",
      },
      {
        k: "Traceability",
        v: "Traceability when available from suppliers (e.g., lot/batch details).",
      },
      {
        k: "Compliance note",
        v: "Regulatory and import requirements vary by destination; we advise accordingly.",
      },
    ],
    capabilityCta: "Download Capability Statement (PDF)",

    mdTitle: "Managing Director",
    mdName: "Mohammad Maani",
    mdRole: "Managing Director (MBA) • 12+ years of operational leadership",
    mdBody:
      "Leads sourcing discipline, partner coordination, and delivery execution across Jordan and regional markets.",
    mdLinkedInLabel: "LinkedIn",

    servicesTitle: "Our services",
    services: [
      "Medical consumables procurement and supply planning",
      "Availability checks and volume-based quotations",
      "Documentation guidance (as applicable) and basic traceability",
      "Order fulfillment coordination and after-sales follow-up",
    ],

    productsTitle: "Our product lines (category-level)",
    productsNote:
      "We publish categories (not a full SKU catalog). Tap a category to prefill your quote template.",
    sectorsTitle: "Who we serve",
    sectors: ["Pharmacies", "Resellers / distributors", "Clinics", "Laboratories"],

    careersTitle: "Recruitment announcements",
    careersSubtitle: "Open vacancies published from CRM. Apply directly below.",
    jobsLoading: "Loading opportunities...",
    jobsEmpty: "No openings announced at the moment.",
    selectJob: "Select this job",
    selectedJobLabel: "Selected job",
    apply: "Apply now",
    submitting: "Submitting...",
    applySuccess: "Your application has been submitted successfully.",
    applyError: "Please select a job and fill all required fields before submitting.",
    readMore: "Read more",
    readLess: "Show less",
    educationPlaceholder: "Education level",
    cv: "CV (required)",
    cover: "Cover letter (optional)",

    quoteTitle: "Request a Quote",
    quoteSubtitle:
      "Fastest way: WhatsApp your request with category, specification, quantity, and delivery city.",
    quoteChecklistTitle: "Include in your message",
    quoteChecklist: [
      "Buyer type (pharmacy or reseller)",
      "Product category + specification (size/material/pack)",
      "Quantity",
      "Delivery city + destination (Jordan or Syria)",
      "Preferred brands (optional)",
    ],
    selectedCategoryLabel: "Selected category",
    clearCategory: "Clear",

    contactTitle: "Contact",
    contactEmail: "Email",
    contactPhone: "Phone",
    contactWhatsapp: "WhatsApp",
    contactAddress: "Address",
    addressValue: "Amman, Jordan",
  },

  ar: {
    dir: "rtl",
    langLabel: "EN",

    brandName: "شركة زمرد للمستلزمات الطبية ذ.م.م",
    tagline: "توريد واعٍ بالامتثال ومواصفات ثابتة للصيدليات والموزعين — الأردن وسوريا.",
    responseSla: "الرد على عروض الأسعار خلال 48 ساعة عمل.",

    ctaStaff: "دخول الموظفين",
    ctaWhatsapp: "واتساب",
    ctaQuote: "طلب عرض سعر",
    ctaQuoteHint: "الانتقال لقسم عرض السعر",

    heroBullets: [
      "توريد جاهز لعروض الأسعار للطلبات المتكررة (ثبات المواصفات والتعبئة).",
      "إرشادات المستندات حسب الوجهة (متطلبات الاستيراد تختلف بين الأردن وسوريا).",
      "تنسيق سريع عبر واتساب للتوفر والبدائل ووقت التوريد.",
    ],
    trustBadges: ["دعم المستندات (عند الاقتضاء)", "رقم تشغيلة/دفعة (عند توفره)", "أوقات توريد واضحة"],

    metrics: [
      { value: "الأردن وسوريا", label: "نطاق الخدمة" },
      { value: "الصيدليات والموزعون", label: "الجهات الأساسية" },
      { value: "ثبات المواصفات", label: "نهج التوريد" },
    ],

    tabs: { about: "الشركة", products: "المنتجات", careers: "الوظائف" },

    aboutTitle: "حلول احترافية للمستلزمات الطبية",
    aboutText:
      "من مقرّنا في عمّان، ندعم الصيدليات والعيادات والمختبرات والموزعين عبر توريد قابل للتتبع ونهج يركز على الجودة والامتثال.",
    aboutPoints: [
      "توريد موثوق مع ثبات في المواصفات",
      "وضوح في أوقات التوريد وتواصل عملي",
      "إرشادات المستندات عند الاقتضاء (المتطلبات تختلف حسب الوجهة)",
    ],

    trustTitle: "الثقة ومعايير التشغيل",
    trustPoints: [
      {
        k: "الفئة المستهدفة",
        v: "مخصص للمشترين المهنيين (صيدليات، موزعون، عيادات، مختبرات).",
      },
      {
        k: "ثبات المواصفات",
        v: "نركز على ثبات المواصفات والتعبئة في الطلبات المتكررة.",
      },
      {
        k: "التتبع",
        v: "تتبع عند توفره من الموردين (مثل رقم التشغيلة/الدفعة).",
      },
      {
        k: "ملاحظة تنظيمية",
        v: "المتطلبات التنظيمية تختلف حسب الوجهة؛ نقدم الإرشاد وفقاً لطلبك.",
      },
    ],
    capabilityCta: "تحميل ملف التعريف (PDF)",

    mdTitle: "المدير العام",
    mdName: "Mohammad Maani",
    mdRole: "المدير العام (MBA) • خبرة 12+ سنة في الإدارة التشغيلية",
    mdBody:
      "يقود الانضباط في التوريد وتنسيق الشركاء وتنفيذ التسليم داخل الأردن والأسواق الإقليمية.",
    mdLinkedInLabel: "لينكدإن",

    servicesTitle: "خدماتنا",
    services: [
      "توريد المستهلكات الطبية وتخطيط احتياجات الإمداد",
      "تأكيد التوفر وتقديم عروض حسب الكميات",
      "إرشادات المستندات (عند الاقتضاء) وتتبع أساسي",
      "تنسيق تنفيذ الطلبات والمتابعة بعد البيع",
    ],

    productsTitle: "خطوط المنتجات (حسب الفئات)",
    productsNote: "نعرض فئات وليس قائمة أصناف كاملة. اضغط على فئة لإضافة الفئة لقالب طلب عرض السعر.",
    sectorsTitle: "الجهات التي نخدمها",
    sectors: ["الصيدليات", "الموزعون/الموردون", "العيادات", "المختبرات"],

    careersTitle: "إعلانات التوظيف",
    careersSubtitle: "الوظائف المفتوحة المنشورة من CRM. يمكن التقديم مباشرة.",
    jobsLoading: "جاري تحميل الفرص...",
    jobsEmpty: "لا توجد وظائف معلنة حالياً.",
    selectJob: "اختيار هذه الوظيفة",
    selectedJobLabel: "الوظيفة المختارة",
    apply: "قدّم الآن",
    submitting: "جاري الإرسال...",
    applySuccess: "تم إرسال طلبك بنجاح.",
    applyError: "يرجى اختيار وظيفة ثم تعبئة جميع الحقول المطلوبة.",
    readMore: "اقرأ المزيد",
    readLess: "عرض أقل",
    educationPlaceholder: "المؤهل العلمي",
    cv: "السيرة الذاتية (مطلوب)",
    cover: "رسالة تغطية (اختياري)",

    quoteTitle: "طلب عرض سعر",
    quoteSubtitle: "الأسرع: أرسل طلبك عبر واتساب مع الفئة والمواصفات والكمية ومدينة التسليم.",
    quoteChecklistTitle: "يرجى تضمين التالي",
    quoteChecklist: [
      "نوع الجهة (صيدلية أو موزع)",
      "فئة المنتج + المواصفات (حجم/مادة/تعبئة)",
      "الكمية",
      "مدينة التسليم + الوجهة (الأردن أو سوريا)",
      "العلامات المفضلة (اختياري)",
    ],
    selectedCategoryLabel: "الفئة المختارة",
    clearCategory: "إزالة",

    contactTitle: "التواصل",
    contactEmail: "البريد الإلكتروني",
    contactPhone: "الهاتف",
    contactWhatsapp: "واتساب",
    contactAddress: "العنوان",
    addressValue: "عمّان، الأردن",
  },
};

const PRODUCT_CARDS = {
  en: [
    { title: "Baby Care", body: "Silicone feeding bottles, pacifiers, and selected baby accessories." },
    { title: "Oral Care", body: "Toothpaste, toothbrushes, and selected oral-care items." },
    { title: "PPE (selected)", body: "Request-based PPE options aligned to your need and destination." },
    { title: "Hygiene & Infection Control", body: "Selected hygiene and infection-prevention items (request-based)." },
    { title: "Clinic Consumables", body: "Routine clinic consumables and procedure support items (selected)." },
    { title: "Lab Consumables (selected)", body: "Selected lab disposables on request, with pack/size matching." },
    { title: "Custom Sourcing", body: "Specification-based sourcing for recurring or volume demand." },
  ],
  ar: [
    { title: "عناية بالأطفال", body: "رضّاعات سيليكون، لهايات، ومستلزمات أطفال مختارة." },
    { title: "عناية فموية", body: "معجون وفرش أسنان وأصناف عناية فموية مختارة." },
    { title: "معدات وقاية (مختارة)", body: "خيارات وقاية حسب الطلب بما يتناسب مع الحاجة والوجهة." },
    { title: "نظافة ومكافحة العدوى", body: "أصناف نظافة ووقاية من العدوى مختارة (حسب الطلب)." },
    { title: "مستهلكات العيادات", body: "مستهلكات عيادات روتينية وأصناف دعم الإجراءات (مختارة)." },
    { title: "مستلزمات مختبر (مختارة)", body: "مستهلكات مخبرية مختارة عند الطلب مع مطابقة التعبئة/الحجم." },
    { title: "توريد حسب الطلب", body: "توريد حسب المواصفات للطلبات الدورية أو الكميات الكبيرة." },
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

function LinkedInIcon({ title = "LinkedIn" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <title>{title}</title>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 8.5H4.5V24H.5V8.5ZM8.5 8.5H12.3V10.6H12.36C12.89 9.6 14.2 8.5 16.2 8.5 20.3 8.5 21 11.1 21 14.5V24H17V15.6C17 13.6 17 11.9 15.2 11.9 13.4 11.9 13.1 13.3 13.1 15.5V24H9.1V8.5H8.5Z" />
    </svg>
  );
}

export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("about");

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // IMPORTANT: do NOT auto-select. User must explicitly choose the job.
  const [selectedJobId, setSelectedJobId] = useState("");

  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});

  const [quoteCategory, setQuoteCategory] = useState("");

  const applyFormRef = useRef(null);
  const quoteRef = useRef(null);

  const t = useMemo(() => COPY[lang], [lang]);

  // Keep document language + dir in sync (accessibility + RTL/LTR correctness)
  useEffect(() => {
    document.documentElement.setAttribute("dir", t.dir);
    document.documentElement.setAttribute("lang", lang === "ar" ? "ar" : "en");
  }, [t.dir, lang]);

  const selectedJob = useMemo(() => {
    const id = Number(selectedJobId || 0);
    return jobs.find((j) => Number(j.id) === id) || null;
  }, [jobs, selectedJobId]);

  useEffect(() => {
    (async () => {
      setJobsLoading(true);
      try {
        const res = await fetch("/api/recruitment?resource=jobs");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        }
      } finally {
        setJobsLoading(false);
      }
    })();
  }, []);

  function scrollToQuote() {
    const el = quoteRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

    const requiredKeys = ["jobId", "firstName", "lastName", "email", "phone", "educationLevel", "country", "city"];
    if (!requiredKeys.every((k) => form.get(k))) {
      setApplyErr(t.applyError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recruitment?resource=apply", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) throw new Error(data.detail || data.error || "Failed to submit application");
      if (data?.sheetSync?.ok === false) throw new Error(data?.sheetSync?.error || "Saved, but Google Sheet sync failed");

      setApplyMsg(t.applySuccess);
      formEl?.reset();
      setSelectedJobId("");
    } catch (err) {
      setApplyErr(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  const quoteMessage = useMemo(() => {
    const header = lang === "ar" ? "طلب عرض سعر — زمرد" : "Quote request — Zomorod";
    const buyer = lang === "ar" ? "الجهة: صيدلية/موزع" : "Buyer type: Pharmacy/Reseller";
    const cat = quoteCategory
      ? (lang === "ar" ? `الفئة المقترحة: ${quoteCategory}` : `Suggested category: ${quoteCategory}`)
      : "";
    const line1 = lang === "ar" ? "الفئة + المواصفات:" : "Category + specification:";
    const line2 = lang === "ar" ? "الكمية:" : "Quantity:";
    const line3 = lang === "ar" ? "مدينة التسليم + الوجهة:" : "Delivery city + destination (Jordan/Syria):";
    return [header, buyer, cat, line1, line2, line3].filter(Boolean).join("\n");
  }, [lang, quoteCategory]);

  const whatsappQuoteHref = buildWhatsAppLink(quoteMessage);

  return (
    <main className="mkt-page" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-hero-top">
          <img className="mkt-logo" src="/logo.png" alt="Zomorod logo" width="120" height="120" />

          <div className="mkt-hero-actions">
            <Link to="/login" className="btn btn-ghost">
              {t.ctaStaff}
            </Link>

            <button
              type="button"
              className="btn btn-ghost mkt-lang"
              onClick={() => setLang((s) => (s === "en" ? "ar" : "en"))}
              aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
            >
              {t.langLabel}
            </button>
          </div>
        </div>

        <h1 className="mkt-title">{t.brandName}</h1>
        <p className="mkt-tagline">{t.tagline}</p>

        <ul className="mkt-hero-bullets">
          {t.heroBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <div className="mkt-trust-row">
          <span className="mkt-pill">{t.responseSla}</span>
          {t.trustBadges.map((b) => (
            <span key={b} className="mkt-pill">
              {b}
            </span>
          ))}
        </div>

        {/* Primary CTA: Quote (scroll). Secondary: WhatsApp */}
        <div className="mkt-cta-row">
          <button type="button" className="btn btn-primary mkt-cta" onClick={scrollToQuote} title={t.ctaQuoteHint}>
            {t.ctaQuote}
          </button>

          <a className="btn btn-ghost mkt-cta" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
            {t.ctaWhatsapp}
          </a>
        </div>

        <div className="mkt-hero-metrics">
          {t.metrics.map((m) => (
            <div className="mkt-metric" key={m.label}>
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="mkt-section card">
        <div className="mkt-tabs" role="tablist" aria-label="Main sections">
          {Object.entries(t.tabs).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={`mkt-tab ${activeTab === key ? "is-active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "about" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.aboutTitle}</h2>
            <p className="mkt-p">{t.aboutText}</p>
            <ul className="mkt-list">{t.aboutPoints.map((point) => <li key={point}>{point}</li>)}</ul>

            <div className="mkt-split">
              <article className="mkt-trust card-soft">
                <h3 className="mkt-h3">{t.trustTitle}</h3>
                <div className="mkt-kv">
                  {t.trustPoints.map((row) => (
                    <div className="mkt-kv-row" key={row.k}>
                      <div className="mkt-k">{row.k}</div>
                      <div className="mkt-v">{row.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10 }}>
                  <a
                    className="btn btn-ghost"
                    href="/docs/zomorod-capability-statement.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.capabilityCta}
                  </a>
                </div>
              </article>

              <article className="mkt-md card-soft">
                <h3 className="mkt-h3">{t.mdTitle}</h3>
                <div className="mkt-md-name">{t.mdName}</div>
                <div className="mkt-md-role">{t.mdRole}</div>
                <p className="mkt-p">{t.mdBody}</p>

                <a
                  className="mkt-icon-link"
                  href="https://www.linkedin.com/in/mohammadamaani/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.mdLinkedInLabel}
                  title={t.mdLinkedInLabel}
                >
                  <LinkedInIcon title={t.mdLinkedInLabel} />
                </a>
              </article>
            </div>
          </div>
        ) : null}

        {activeTab === "products" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.productsTitle}</h2>
            <p className="mkt-p">{t.productsNote}</p>

            <div className="mkt-grid">
              {PRODUCT_CARDS[lang].map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className="mkt-card mkt-card-btn"
                  onClick={() => {
                    setQuoteCategory(card.title);
                    scrollToQuote();
                  }}
                >
                  <div className="mkt-card-title">{card.title}</div>
                  <p className="mkt-card-body">{card.body}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "careers" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.careersTitle}</h2>
            <p className="mkt-p">{t.careersSubtitle}</p>

            {jobsLoading ? (
              <p className="mkt-p">{t.jobsLoading}</p>
            ) : (
              <div className="mkt-jobs-list">
                {jobs.map((job) => (
                  <article key={job.id} className="mkt-job-card">
                    <div className="mkt-card-title">{job.title}</div>
                    <p className="mkt-card-body">
                      {[job.department, job.location_city, job.location_country, job.employment_type]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>

                    {(() => {
                      const fullText = stripHtml(job.job_description_html);
                      const isLong = fullText.split(/\s+/).filter(Boolean).length > 50;
                      const isExpanded = !!expandedJobs[job.id];
                      return (
                        <>
                          <div className="mkt-job-description">
                            {isLong && !isExpanded ? (
                              <p>{truncateWords(fullText, 50)}</p>
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: job.job_description_html }} />
                            )}
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

                    <button className="btn btn-primary" type="button" onClick={() => handleSelectJob(job.id)}>
                      {t.selectJob}
                    </button>
                  </article>
                ))}
                {!jobs.length ? <p className="mkt-p">{t.jobsEmpty}</p> : null}
              </div>
            )}

            {jobs.length ? (
              <form ref={applyFormRef} className="mkt-apply-form" onSubmit={onApply}>
                <input type="hidden" name="jobId" value={selectedJobId || ""} />

                <div className="mkt-selected-job">
                  <span className="mkt-selected-job-label">{t.selectedJobLabel}:</span>
                  <span className="mkt-selected-job-value">
                    {selectedJob
                      ? selectedJob.title
                      : lang === "ar"
                        ? "يرجى اختيار وظيفة أعلاه"
                        : "Please select a job above"}
                  </span>
                </div>

                <div className="grid grid-2">
                  <input className="input" name="firstName" placeholder={lang === "ar" ? "الاسم الأول" : "First name"} required />
                  <input className="input" name="lastName" placeholder={lang === "ar" ? "اسم العائلة" : "Last name"} required />
                  <input className="input" type="email" name="email" placeholder="Email" required />
                  <input className="input" name="phone" placeholder={lang === "ar" ? "رقم الهاتف" : "Phone number"} required />
                  <select className="input" name="educationLevel" defaultValue="" required>
                    <option value="" disabled>
                      {t.educationPlaceholder}
                    </option>
                    {EDUCATION_LEVEL_OPTIONS[lang].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <input className="input" name="country" placeholder={lang === "ar" ? "الدولة" : "Country"} required />
                  <input className="input" name="city" placeholder={lang === "ar" ? "المدينة" : "City"} required />
                </div>

                <div className="grid grid-2" style={{ marginTop: 10 }}>
                  <label>
                    {t.cv}
                    <input className="input" name="cv" type="file" required />
                  </label>
                  <label>
                    {t.cover}
                    <input className="input" name="cover" type="file" />
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting || !selectedJobId}>
                  {submitting ? t.submitting : t.apply}
                </button>

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
            <ul className="mkt-list">{t.services.map((service) => <li key={service}>{service}</li>)}</ul>
          </article>
          <article>
            <h2 className="mkt-h2">{t.sectorsTitle}</h2>
            <div className="mkt-grid mkt-grid-compact">
              {t.sectors.map((sector) => (
                <div key={sector} className="mkt-card">
                  <div className="mkt-card-title">{sector}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mkt-section card" id="mkt-quote" ref={quoteRef}>
        <h2 className="mkt-h2">{t.quoteTitle}</h2>
        <p className="mkt-p">{t.quoteSubtitle}</p>

        {quoteCategory ? (
          <div className="mkt-trust-row" style={{ marginTop: 8 }}>
            <span className="mkt-pill">
              {t.selectedCategoryLabel}: <bdi>{quoteCategory}</bdi>
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setQuoteCategory("")}>
              {t.clearCategory}
            </button>
          </div>
        ) : null}

        <div className="mkt-quote-grid">
          <div>
            <h3 className="mkt-h3">{t.quoteChecklistTitle}</h3>
            <ul className="mkt-list">{t.quoteChecklist.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>

          <div className="mkt-quote-actions">
            <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
              {t.ctaWhatsapp}
            </a>
            <a className="btn" href="mailto:info@zomorodmedical.com">
              {t.contactEmail}
            </a>
          </div>
        </div>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.contactTitle}</h2>
        <div className="mkt-contact">
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactWhatsapp}</span>
            <a
              href={buildWhatsAppLink(lang === "ar" ? "مرحباً، أود طلب عرض سعر" : "Hello, I’d like a quote")}
              className="ltr"
            >
              <bdi>wa.me/{WHATSAPP_NUMBER}</bdi>
            </a>
          </div>

          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactEmail}</span>
            <a href="mailto:info@zomorodmedical.com" className="ltr">
              <bdi>info@zomorodmedical.com</bdi>
            </a>
          </div>

          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactPhone}</span>
            <a href="tel:+962791752686" className="ltr">
              <bdi>+962 79 175 2686</bdi>
            </a>
          </div>

          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactAddress}</span>
            <span>{t.addressValue}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
