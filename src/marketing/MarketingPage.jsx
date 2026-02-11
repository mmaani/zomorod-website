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
      "Reliable supply and consistent specifications for pharmacies and resellers — Jordan & Syria.",
    responseSla: "Quote response within 48 business hours.",

    ctaStaff: "Staff Login",
    ctaWhatsapp: "Get a Quote",

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

    productsTitle: "Pilot product lines",
    productsNote:
      "Category-level view — request a quotation for exact SKUs, packaging, and documentation.",
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
    tagline: "توريد موثوق ومواصفات ثابتة للصيدليات والموزعين — الأردن وسوريا.",
    responseSla: "الرد على عروض الأسعار خلال 48 ساعة عمل.",

    ctaStaff: "دخول الموظفين",
    ctaWhatsapp: "احصل على عرض سعر",

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

    productsTitle: "خطوط المنتجات التجريبية",
    productsNote:
      "عرض حسب الفئات — اطلب عرض سعر لتحديد الأصناف الدقيقة والتغليف والمتطلبات الوثائقية.",
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
    quoteSubtitle:
      "الأسرع: أرسل طلبك عبر واتساب مع الفئة والمواصفات والكمية ومدينة التسليم.",
    quoteChecklistTitle: "يرجى تضمين التالي",
    quoteChecklist: [
      "نوع الجهة (صيدلية أو موزع)",
      "فئة المنتج + المواصفات (حجم/مادة/تعبئة)",
      "الكمية",
      "مدينة التسليم + الوجهة (الأردن أو سوريا)",
      "العلامات المفضلة (اختياري)",
    ],

    contactTitle: "التواصل",
    contactEmail: "البريد الإلكتروني",
    contactPhone: "الهاتف",
    contactAddress: "العنوان",
    addressValue: "عمّان، الأردن",
  },
};

const PRODUCT_FILTERS = {
  en: [
    { key: "all", label: "All" },
    { key: "wound", label: "Wound care" },
    { key: "ppe", label: "PPE" },
    { key: "baby", label: "Baby care" },
  ],
  ar: [
    { key: "all", label: "الكل" },
    { key: "wound", label: "العناية بالجروح" },
    { key: "ppe", label: "معدات وقاية" },
    { key: "baby", label: "عناية بالأطفال" },
  ],
};

const PRODUCT_ITEMS = {
  en: [
    {
      id: "adv-wound",
      category: "wound",
      title: "Advanced wound care dressings",
      body: "Silicone foam, hydrocolloid, and transparent film dressings (sterile options).",
      img: "/products/advanced-wound-care.svg",
      tags: ["Sterile options", "Clinic use", "High margin"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "Basic wound care consumables",
      body: "Gauze swabs & rolls, non-woven pads, and elastic/crepe bandages for routine care.",
      img: "/products/basic-wound-care.svg",
      tags: ["Fast-moving", "Bundling-friendly", "Reliable specs"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "Nitrile examination gloves",
      body: "Powder-free nitrile exam gloves (sizes S/M) with consistent QC and clear labeling.",
      img: "/products/nitrile-gloves.svg",
      tags: ["Powder-free", "S/M sizes", "Blue/pink/black"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "Type IIR surgical masks ",
      body: "Type IIR masks with ear-loop or head-loop options, suitable for private-sector channels.",
      img: "/products/surgical-masks.svg",
      tags: ["Type IIR", "Ear/Head loop", "Color options"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "Silicone baby feeding bottles",
      body: "Food-grade silicone bottles (150/240/330 ml), heat-resistant and sterilization-safe.",
      img: "/products/silicone-baby-bottle.svg",
      tags: ["Food-grade", "BPA-free", "Handle-free"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "Silicone pacifiers (phase 2)",
      body: "Orthodontic and standard shapes (0–6m / 6–18m), individually packaged.",
      img: "/products/silicone-pacifier.svg",
      tags: ["Orthodontic", "2 age ranges", "Individually packed"],
    },
  ],
  ar: [
    {
      id: "adv-wound",
      category: "wound",
      title: "ضمادات عناية متقدمة بالجروح",
      body: "ضمادات رغوية سيليكون، هيدروكولويد، وضمادات فيلم شفافة (خيارات معقمة).",
      img: "/products/advanced-wound-care.svg",
      tags: ["خيارات معقمة", "استخدام عيادات", "هامش مرتفع"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "مستلزمات العناية الأساسية بالجروح",
      body: "شاش معقم ولفائف شاش، فوط/وسائد غير منسوجة، ورباط/ضماد مرن للعناية الروتينية.",
      img: "/products/basic-wound-care.svg",
      tags: ["سريع الدوران", "مناسب للتجميع", "مواصفات ثابتة"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "قفازات فحص نيتريل",
      body: "قفازات نيتريل للفحص بدون بودرة (مقاسات S/M) مع ضبط جودة وتوسيم واضح.",
      img: "/products/nitrile-gloves.svg",
      tags: ["بدون بودرة", "مقاسات S/M", "أزرق/وردي/أسود"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "كمامات جراحية Type IIR",
      body: "كمامات Type IIR بخيارات ربط خلف الأذن أو خلف الرأس، مناسبة لقنوات القطاع الخاص.",
      img: "/products/surgical-masks.svg",
      tags: ["Type IIR", "رباط أذن/رأس", "خيارات ألوان"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "رضّاعات سيليكون",
      body: "رضّاعات سيليكون بدرجة غذائية (150/240/330 مل)، مقاومة للحرارة وآمنة للتعقيم.",
      img: "/products/silicone-baby-bottle.svg",
      tags: ["درجة غذائية", "خالٍ من BPA", "بدون مقابض"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "لهايات سيليكون (مرحلة 2)",
      body: "أشكال تقويمية وعادية (0–6 أشهر / 6–18 شهر)، مغلفة بشكل فردي.",
      img: "/products/silicone-pacifier.svg",
      tags: ["تقويمية", "فئتان عمريتان", "تغليف فردي"],
    },
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
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 8.5H4.5V24H.5V8.5ZM8.5 8.5H12.3V10.6H12.36C12.89 9.6 14.2 8.5 16.2 8.5 20.3 8.5 21 11.1 21 14.5V24H17V15.6C17 13.6 17 11.9 15.2 11.9 13.4 11.9 13.1 13.3 13.1 15.5V24H9.1V8.5H8.5Z" />
    </svg>
  );
}

export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("about");
  const [productFilter, setProductFilter] = useState("all");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // IMPORTANT: do NOT auto-select. User must explicitly choose the job.
  const [selectedJobId, setSelectedJobId] = useState("");

  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});
  const applyFormRef = useRef(null);
  const t = useMemo(() => COPY[lang], [lang]);

  const selectedJob = useMemo(() => {
    const id = Number(selectedJobId || 0);
    return jobs.find((j) => Number(j.id) === id) || null;
  }, [jobs, selectedJobId]);

  const quoteRef = useRef(null);

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
    } catch (err) {
      setApplyErr(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  const quoteMessage = useMemo(() => {
    const buyer = lang === "ar" ? "الجهة: صيدلية/موزع" : "Buyer type: Pharmacy/Reseller";
    const header = lang === "ar" ? "طلب عرض سعر — زمرد" : "Quote request — Zomorod";
    const line1 = lang === "ar" ? "الفئة + المواصفات:" : "Category + specification:";
    const line2 = lang === "ar" ? "الكمية:" : "Quantity:";
    const line3 = lang === "ar" ? "مدينة التسليم + الوجهة:" : "Delivery city + destination (Jordan/Syria):";
    return `${header}\n${buyer}\n${line1}\n${line2}\n${line3}`;
  }, [lang]);

  const whatsappQuoteHref = buildWhatsAppLink(quoteMessage);

  return (
    <main className="mkt-page" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-hero-top">
          <img className="mkt-logo" src="/logo.png" alt="Zomorod logo" />
          <button
            type="button"
            className="btn btn-ghost mkt-lang"
            onClick={() => setLang((s) => (s === "en" ? "ar" : "en"))}
          >
            {t.langLabel}
          </button>
        </div>

        <div className="mkt-hero-main">
          <div className="mkt-hero-copy">
            <h1 className="mkt-title">{t.brandName}</h1>
            <p className="mkt-tagline">{t.tagline}</p>

            <div className="mkt-trust-row">
              <span className="mkt-pill">{t.responseSla}</span>
            </div>

            {/* CTAs: max 2 */}
            <div className="mkt-cta-row">
              <a
                className="btn btn-primary mkt-cta"
                href={whatsappQuoteHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.ctaWhatsapp}
              </a>

              <Link to="/login" className="btn btn-ghost mkt-cta">
                {t.ctaStaff}
              </Link>
            </div>
          </div>

          <div className="mkt-hero-art" aria-hidden="true">
            <img
              className="mkt-hero-illustration"
              src="/products/hero-illustration.svg"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
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

            <div
              className="mkt-products-toolbar"
              role="tablist"
              aria-label={lang === "ar" ? "تصفية المنتجات" : "Product filters"}
            >
              {PRODUCT_FILTERS[lang].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`mkt-filter ${productFilter === f.key ? "is-active" : ""}`}
                  onClick={() => setProductFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mkt-products-grid">
              {PRODUCT_ITEMS[lang]
                .filter((p) => productFilter === "all" || p.category === productFilter)
                .map((p) => (
                  <article className="mkt-product-card" key={p.id}>
                    <div className="mkt-product-thumb" aria-hidden="true">
                      <img src={p.img} alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className="mkt-product-title">{p.title}</div>
                    <p className="mkt-product-body">{p.body}</p>
                    <div className="mkt-product-tags">
                      {p.tags.map((tag) => (
                        <span className="mkt-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
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
                      {[job.department, job.location_city, job.location_country, job.employment_type].filter(Boolean).join(" • ")}
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
                    {selectedJob ? selectedJob.title : (lang === "ar" ? "يرجى اختيار وظيفة أعلاه" : "Please select a job above")}
                  </span>
                </div>

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
                <div key={sector} className="mkt-card"><div className="mkt-card-title">{sector}</div></div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mkt-section card" id="mkt-quote" ref={quoteRef}>
        <h2 className="mkt-h2">{t.quoteTitle}</h2>
        <p className="mkt-p">{t.quoteSubtitle}</p>

        <div className="mkt-quote-grid">
          <div>
            <h3 className="mkt-h3">{t.quoteChecklistTitle}</h3>
            <ul className="mkt-list">{t.quoteChecklist.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>

          {/* CTAs: max 2 */}
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
            <span className="mkt-contact-label">{t.contactEmail}</span>
            <a href="mailto:info@zomorodmedical.com" className="ltr">info@zomorodmedical.com</a>
          </div>
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactPhone}</span>
            <a href="tel:+962791752686" className="ltr">+962 79 175 2686</a>
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
