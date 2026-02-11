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

    nav: { company: "Company", products: "Products", careers: "Careers", contact: "Contact" },

    ctaStaff: "Staff Login",
    ctaQuote: "Get a Quote",
    ctaBrowse: "Browse Products",

    highlights: [
      { title: "Consistent specs", text: "Stable packaging and specifications across repeat orders." },
      { title: "Fast quoting", text: "Clear, practical quotes with availability checks when needed." },
      { title: "Buyer-focused", text: "Designed for pharmacies, resellers, clinics, and labs." },
    ],

    stats: [
      { value: "48h", label: "Quote response" },
      { value: "Jordan & Syria", label: "Coverage" },
      { value: "Compliance-aware", label: "Documentation guidance" },
      { value: "Consistency-first", label: "Supply approach" },
    ],

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
      { k: "Buyer fit", v: "Built for professional buyers (pharmacies, resellers, clinics, labs)." },
      { k: "Consistency", v: "We prioritize stable specs and packaging across repeat orders." },
      { k: "Traceability", v: "Traceability when available (e.g., lot/batch details)." },
      { k: "Compliance note", v: "Regulatory and import requirements vary by destination; we advise accordingly." },
    ],

    productsTitle: "Pilot product lines",
    productsNote: "Category-level view — request a quotation for exact SKUs, packaging, and documentation.",
    filters: [
      { key: "all", label: "All" },
      { key: "wound", label: "Wound care" },
      { key: "ppe", label: "PPE" },
      { key: "baby", label: "Baby care" },
    ],

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
    quoteSubtitle: "Fastest way: WhatsApp your request with category, specification, quantity, and delivery city.",
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

    nav: { company: "الشركة", products: "المنتجات", careers: "الوظائف", contact: "التواصل" },

    ctaStaff: "دخول الموظفين",
    ctaQuote: "احصل على عرض سعر",
    ctaBrowse: "تصفح المنتجات",

    highlights: [
      { title: "ثبات المواصفات", text: "تغليف ومواصفات مستقرة في الطلبات المتكررة." },
      { title: "عروض سريعة", text: "تسعير عملي مع تأكيد التوفر عند الحاجة." },
      { title: "للجهات المهنية", text: "مناسب للصيدليات والموزعين والعيادات والمختبرات." },
    ],

    stats: [
      { value: "48 ساعة", label: "زمن الرد" },
      { value: "الأردن وسوريا", label: "نطاق الخدمة" },
      { value: "إرشاد وثائقي", label: "امتثال حسب الوجهة" },
      { value: "ثبات التوريد", label: "نهج التشغيل" },
    ],

    aboutTitle: "حلول احترافية للمستلزمات الطبية",
    aboutText:
      "من مقرّنا في عمّان، ندعم الصيدليات والعيادات والمختبرات والموزعين عبر توريد منضبط وواضح وتنفيذ موثوق.",
    aboutPoints: [
      "توريد موثوق مع ثبات في المواصفات",
      "وضوح في أوقات التوريد وتواصل عملي",
      "إرشادات المستندات عند الاقتضاء (المتطلبات تختلف حسب الوجهة)",
    ],

    trustTitle: "الثقة ومعايير التشغيل",
    trustPoints: [
      { k: "الفئة المستهدفة", v: "مخصص للمشترين المهنيين (صيدليات، موزعون، عيادات، مختبرات)." },
      { k: "ثبات المواصفات", v: "نركز على ثبات المواصفات والتعبئة في الطلبات المتكررة." },
      { k: "التتبع", v: "تتبع عند توفره من الموردين (مثل رقم التشغيلة/الدفعة)." },
      { k: "ملاحظة تنظيمية", v: "المتطلبات التنظيمية تختلف حسب الوجهة؛ نقدم الإرشاد وفقاً لطلبك." },
    ],

    productsTitle: "خطوط المنتجات التجريبية",
    productsNote: "عرض حسب الفئات — اطلب عرض سعر لتحديد الأصناف الدقيقة والتغليف والمتطلبات الوثائقية.",
    filters: [
      { key: "all", label: "الكل" },
      { key: "wound", label: "العناية بالجروح" },
      { key: "ppe", label: "معدات وقاية" },
      { key: "baby", label: "عناية بالأطفال" },
    ],

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

    contactTitle: "التواصل",
    contactEmail: "البريد الإلكتروني",
    contactPhone: "الهاتف",
    contactAddress: "العنوان",
    addressValue: "عمّان، الأردن",
  },
};

const PRODUCT_ITEMS = {
  en: [
    {
      id: "adv-wound",
      category: "wound",
      title: "Advanced wound care dressings",
      body: "Silicone foam, hydrocolloid, and transparent film dressings (sterile options).",
      imgPng: "/products/advanced-wound-care.png",
      imgPng2x: "/products/advanced-wound-care@2x.png",
      imgSvg: "/products/advanced-wound-care.svg",
      tags: ["Sterile options", "Clinic use", "High margin"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "Basic wound care consumables",
      body: "Gauze swabs & rolls, non-woven pads, and elastic/crepe bandages for routine care.",
      imgPng: "/products/basic-wound-care.png",
      imgPng2x: "/products/basic-wound-care@2x.png",
      imgSvg: "/products/basic-wound-care.svg",
      tags: ["Fast-moving", "Bundling-friendly", "Reliable specs"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "Nitrile examination gloves",
      body: "Powder-free nitrile exam gloves (sizes S/M) with consistent QC and clear labeling.",
      imgPng: "/products/nitrile-gloves.png",
      imgPng2x: "/products/nitrile-gloves@2x.png",
      imgSvg: "/products/nitrile-gloves.svg",
      tags: ["Powder-free", "S/M sizes", "Blue/pink/black"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "Type IIR surgical masks (optional add-on)",
      body: "Type IIR masks with ear-loop or head-loop options, suitable for private-sector channels.",
      imgPng: "/products/surgical-masks.png",
      imgPng2x: "/products/surgical-masks@2x.png",
      imgSvg: "/products/surgical-masks.svg",
      tags: ["Type IIR", "Ear/Head loop", "Color options"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "Silicone baby feeding bottles",
      body: "Food-grade silicone bottles (150/240/330 ml), heat-resistant and sterilization-safe.",
      imgPng: "/products/silicone-baby-bottle.png",
      imgPng2x: "/products/silicone-baby-bottle@2x.png",
      imgSvg: "/products/silicone-baby-bottle.svg",
      tags: ["Food-grade", "BPA-free", "Handle-free"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "Silicone pacifiers (phase 2)",
      body: "Orthodontic and standard shapes (0–6m / 6–18m), individually packaged.",
      imgPng: "/products/silicone-pacifier.png",
      imgPng2x: "/products/silicone-pacifier@2x.png",
      imgSvg: "/products/silicone-pacifier.svg",
      tags: ["Orthodontic", "2 age ranges", "Individually packed"],
    },
  ],
  ar: [
    {
      id: "adv-wound",
      category: "wound",
      title: "ضمادات عناية متقدمة بالجروح",
      body: "ضمادات رغوية سيليكون، هيدروكولويد، وضمادات فيلم شفافة (خيارات معقمة).",
      imgPng: "/products/advanced-wound-care.png",
      imgPng2x: "/products/advanced-wound-care@2x.png",
      imgSvg: "/products/advanced-wound-care.svg",
      tags: ["خيارات معقمة", "استخدام عيادات", "هامش مرتفع"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "مستلزمات العناية الأساسية بالجروح",
      body: "شاش معقم ولفائف شاش، فوط/وسائد غير منسوجة، ورباط/ضماد مرن للعناية الروتينية.",
      imgPng: "/products/basic-wound-care.png",
      imgPng2x: "/products/basic-wound-care@2x.png",
      imgSvg: "/products/basic-wound-care.svg",
      tags: ["سريع الدوران", "مناسب للتجميع", "مواصفات ثابتة"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "قفازات فحص نيتريل",
      body: "قفازات نيتريل للفحص بدون بودرة (مقاسات S/M) مع ضبط جودة وتوسيم واضح.",
      imgPng: "/products/nitrile-gloves.png",
      imgPng2x: "/products/nitrile-gloves@2x.png",
      imgSvg: "/products/nitrile-gloves.svg",
      tags: ["بدون بودرة", "مقاسات S/M", "أزرق/وردي/أسود"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "كمامات جراحية Type IIR (اختياري)",
      body: "كمامات Type IIR بخيارات ربط خلف الأذن أو خلف الرأس، مناسبة لقنوات القطاع الخاص.",
      imgPng: "/products/surgical-masks.png",
      imgPng2x: "/products/surgical-masks@2x.png",
      imgSvg: "/products/surgical-masks.svg",
      tags: ["Type IIR", "رباط أذن/رأس", "خيارات ألوان"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "رضّاعات سيليكون",
      body: "رضّاعات سيليكون بدرجة غذائية (150/240/330 مل)، مقاومة للحرارة وآمنة للتعقيم.",
      imgPng: "/products/silicone-baby-bottle.png",
      imgPng2x: "/products/silicone-baby-bottle@2x.png",
      imgSvg: "/products/silicone-baby-bottle.svg",
      tags: ["درجة غذائية", "خالٍ من BPA", "بدون مقابض"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "لهايات سيليكون (مرحلة 2)",
      body: "أشكال تقويمية وعادية (0–6 أشهر / 6–18 شهر)، مغلفة بشكل فردي.",
      imgPng: "/products/silicone-pacifier.png",
      imgPng2x: "/products/silicone-pacifier@2x.png",
      imgSvg: "/products/silicone-pacifier.svg",
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

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check")
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M9.55 17.3 4.9 12.65l1.4-1.4 3.25 3.25 8.15-8.15 1.4 1.4z"
        />
      </svg>
    );
  if (name === "bolt")
    return (
      <svg {...common}>
        <path
          fill="currentColor"
          d="M13 2 3 14h7l-1 8 10-12h-7z"
        />
      </svg>
    );
  return (
    <svg {...common}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14.5h-2v-2h2v2Zm0-4h-2V7.5h2v5Z"
      />
    </svg>
  );
}

export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);

  const [productFilter, setProductFilter] = useState("all");

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});
  const applyFormRef = useRef(null);

  const companyRef = useRef(null);
  const productsRef = useRef(null);
  const careersRef = useRef(null);
  const quoteRef = useRef(null);
  const contactRef = useRef(null);

  const t = useMemo(() => COPY[lang], [lang]);

  const whatsappQuoteHref = useMemo(() => {
    const base =
      lang === "ar"
        ? "مرحباً، أريد عرض سعر. الرجاء تحديد الفئة والمواصفات والكمية ومدينة التسليم."
        : "Hi, I'd like a quote. Please specify category, specs, quantity, and delivery city.";
    return buildWhatsAppLink(base);
  }, [lang]);

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
        if (res.ok && data.ok) setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        else setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    })();
  }, []);

  function scrollToRef(ref) {
    setMenuOpen(false);
    const el = ref?.current;
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

  const filteredProducts = useMemo(() => {
    const items = PRODUCT_ITEMS[lang] || [];
    if (productFilter === "all") return items;
    return items.filter((p) => p.category === productFilter);
  }, [lang, productFilter]);

  // Hero uses existing product images so you don’t get broken placeholders on mobile.
  const heroImgs = useMemo(
    () => [
      "/products/nitrile-gloves.png",
      "/products/advanced-wound-care.png",
      "/products/silicone-baby-bottle.png",
    ],
    []
  );

  return (
    <main className="mkt2" dir={t.dir}>
      <div className="container">
        {/* Sticky header */}
        <header className="mkt2-header card">
          <div className="mkt2-topbar">
            <Link to="/" className="mkt2-brand" aria-label="Zomorod Medical Supplies">
              <img className="mkt2-logo" src="/logo.png" alt="" />
              <span className="mkt2-brandText">ZOMOROD</span>
            </Link>

            {/* Desktop nav */}
            <nav className="mkt2-nav" aria-label="Primary">
              <button type="button" className="mkt2-navLink" onClick={() => scrollToRef(companyRef)}>
                {t.nav.company}
              </button>
              <button type="button" className="mkt2-navLink" onClick={() => scrollToRef(productsRef)}>
                {t.nav.products}
              </button>
              <button type="button" className="mkt2-navLink" onClick={() => scrollToRef(careersRef)}>
                {t.nav.careers}
              </button>
              <button type="button" className="mkt2-navLink" onClick={() => scrollToRef(contactRef)}>
                {t.nav.contact}
              </button>
            </nav>

            {/* Actions */}
            <div className="mkt2-actions">
              <Link to="/login" className="btn btn-ghost mkt2-hideSm">
                {t.ctaStaff}
              </Link>
              <a className="btn btn-primary mkt2-hideSm" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                {t.ctaQuote}
              </a>

              <button
                type="button"
                className="btn btn-ghost mkt2-lang"
                onClick={() => {
                  setMenuOpen(false);
                  setLang((p) => (p === "en" ? "ar" : "en"));
                }}
              >
                {t.langLabel}
              </button>

              <button
                type="button"
                className="btn btn-ghost mkt2-burger"
                aria-label="Menu"
                aria-expanded={menuOpen ? "true" : "false"}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen ? (
            <div className="mkt2-mobileMenu card-soft">
              <button type="button" className="mkt2-mobileLink" onClick={() => scrollToRef(companyRef)}>
                {t.nav.company}
              </button>
              <button type="button" className="mkt2-mobileLink" onClick={() => scrollToRef(productsRef)}>
                {t.nav.products}
              </button>
              <button type="button" className="mkt2-mobileLink" onClick={() => scrollToRef(careersRef)}>
                {t.nav.careers}
              </button>
              <button type="button" className="mkt2-mobileLink" onClick={() => scrollToRef(contactRef)}>
                {t.nav.contact}
              </button>

              <div className="mkt2-mobileCtas">
                <Link to="/login" className="btn btn-ghost">
                  {t.ctaStaff}
                </Link>
                <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                  {t.ctaQuote}
                </a>
              </div>
            </div>
          ) : null}
        </header>

        {/* Hero */}
        <section className="mkt2-hero card">
          <div className="mkt2-heroGrid">
            <div className="mkt2-heroCopy">
              <div className="mkt2-pill">
                <Icon name="bolt" /> <span>{t.responseSla}</span>
              </div>

              <h1 className="mkt2-h1">{t.brandName}</h1>
              <p className="mkt2-sub">{t.tagline}</p>

              <div className="mkt2-heroCtas">
                <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                  {t.ctaQuote}
                </a>
                <button type="button" className="btn btn-ghost" onClick={() => scrollToRef(productsRef)}>
                  {t.ctaBrowse}
                </button>
              </div>

              <div className="mkt2-highlights">
                {t.highlights.map((h) => (
                  <div key={h.title} className="mkt2-highlight card-soft">
                    <div className="mkt2-highlightTitle">{h.title}</div>
                    <div className="mkt2-highlightText">{h.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mkt2-heroVisual" aria-hidden="true">
              <div className="mkt2-visualPlate" />
              {heroImgs.map((src, idx) => (
                <img
                  key={src}
                  className={`mkt2-visualImg mkt2-visualImg-${idx + 1}`}
                  src={src}
                  alt=""
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mkt2-stats">
            {t.stats.map((s) => (
              <div key={s.label} className="mkt2-stat card-soft">
                <div className="mkt2-statValue">{s.value}</div>
                <div className="mkt2-statLabel">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Company */}
        <section ref={companyRef} id="company" className="mkt2-section card">
          <div className="mkt2-sectionHead">
            <h2 className="mkt2-h2">{t.aboutTitle}</h2>
            <p className="muted">{t.aboutText}</p>
          </div>

          <div className="mkt2-twoCol">
            <div className="mkt2-soft">
              <ul className="mkt2-bullets">
                {t.aboutPoints.map((p) => (
                  <li key={p}>
                    <span className="mkt2-bulletIcon"><Icon name="check" /></span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mkt2-soft">
              <div className="mkt2-softTitle">{t.trustTitle}</div>
              <div className="mkt2-kv">
                {t.trustPoints.map((x) => (
                  <div key={x.k} className="mkt2-kvRow">
                    <div className="mkt2-k">{x.k}</div>
                    <div className="mkt2-v muted">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section ref={productsRef} id="products" className="mkt2-section card">
          <div className="mkt2-sectionHead">
            <h2 className="mkt2-h2">{t.productsTitle}</h2>
            <p className="muted">{t.productsNote}</p>
          </div>

          <div className="mkt2-filters">
            {t.filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`mkt2-filter ${productFilter === f.key ? "is-active" : ""}`}
                onClick={() => setProductFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mkt2-productsGrid">
            {filteredProducts.map((p) => (
              <div key={p.id} className="mkt2-product card-soft">
                <div className="mkt2-productMedia">
                  <img
                    src={p.imgPng}
                    srcSet={`${p.imgPng} 1x, ${p.imgPng2x} 2x`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (p.imgSvg) e.currentTarget.src = p.imgSvg;
                      else e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="mkt2-productBody">
                  <div className="mkt2-productTitle">{p.title}</div>
                  <div className="mkt2-productText muted">{p.body}</div>

                  <div className="mkt2-tags">
                    {p.tags.map((x) => (
                      <span key={x} className="mkt2-tag">{x}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Careers */}
        <section ref={careersRef} id="careers" className="mkt2-section card">
          <div className="mkt2-sectionHead">
            <h2 className="mkt2-h2">{t.careersTitle}</h2>
            <p className="muted">{t.careersSubtitle}</p>
          </div>

          <div className="mkt2-careersGrid">
            <div className="mkt2-soft">
              {jobsLoading ? (
                <div className="muted">{t.jobsLoading}</div>
              ) : jobs.length === 0 ? (
                <div className="muted">{t.jobsEmpty}</div>
              ) : (
                <div className="mkt2-jobList">
                  {jobs.map((job) => {
                    const plain = stripHtml(job.description || "");
                    const expanded = !!expandedJobs[job.id];
                    const snippet = expanded ? plain : truncateWords(plain, 26);

                    return (
                      <div key={job.id} className="mkt2-job">
                        <div className="mkt2-jobTop">
                          <div>
                            <div className="mkt2-jobTitle">{job.title}</div>
                            <div className="mkt2-jobMeta muted">
                              {job.country}
                              {job.city ? ` • ${job.city}` : ""}
                              {job.type ? ` • ${job.type}` : ""}
                            </div>
                          </div>

                          <button type="button" className="btn btn-ghost" onClick={() => handleSelectJob(job.id)}>
                            {t.selectJob}
                          </button>
                        </div>

                        <div className="mkt2-jobDesc muted">{snippet}</div>

                        {plain && plain.split(/\s+/).filter(Boolean).length > 26 ? (
                          <button
                            type="button"
                            className="mkt2-readmore"
                            onClick={() => setExpandedJobs((prev) => ({ ...prev, [job.id]: !prev[job.id] }))}
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

            <div ref={applyFormRef} className="mkt2-soft">
              <div className="mkt2-applyHead">
                <div className="mkt2-softTitle">{t.apply}</div>
                <div className="muted">
                  {t.selectedJobLabel}: <strong>{selectedJob ? selectedJob.title : "—"}</strong>
                </div>
              </div>

              {applyMsg ? <div className="mkt2-success">{applyMsg}</div> : null}
              {applyErr ? <div className="mkt2-error">{applyErr}</div> : null}

              <form className="mkt2-form" onSubmit={onApply}>
                <div className="mkt2-formRow">
                  <label>
                    <span>First Name*</span>
                    <input name="firstName" required />
                  </label>
                  <label>
                    <span>Last Name*</span>
                    <input name="lastName" required />
                  </label>
                </div>

                <div className="mkt2-formRow">
                  <label>
                    <span>Email*</span>
                    <input type="email" name="email" required />
                  </label>
                  <label>
                    <span>Phone*</span>
                    <input name="phone" required />
                  </label>
                </div>

                <div className="mkt2-formRow">
                  <label>
                    <span>{t.educationPlaceholder}*</span>
                    <select name="educationLevel" required defaultValue="">
                      <option value="" disabled>—</option>
                      {(EDUCATION_LEVEL_OPTIONS[lang] || EDUCATION_LEVEL_OPTIONS.en).map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Country*</span>
                    <input name="country" required />
                  </label>
                </div>

                <div className="mkt2-formRow">
                  <label>
                    <span>City*</span>
                    <input name="city" required />
                  </label>
                  <label>
                    <span>{t.cv}*</span>
                    <input type="file" name="cv" accept=".pdf,.doc,.docx" required />
                  </label>
                </div>

                <label>
                  <span>{t.cover}</span>
                  <textarea name="coverLetter" rows={4} />
                </label>

                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? t.submitting : t.apply}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Quote + Contact */}
        <section ref={quoteRef} id="quote" className="mkt2-section card">
          <div className="mkt2-sectionHead">
            <h2 className="mkt2-h2">{t.quoteTitle}</h2>
            <p className="muted">{t.quoteSubtitle}</p>
          </div>

          <div className="mkt2-quoteGrid">
            <div className="mkt2-soft">
              <div className="mkt2-softTitle">{t.quoteChecklistTitle}</div>
              <ul className="mkt2-bullets">
                {t.quoteChecklist.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                  {t.ctaQuote}
                </a>
              </div>
            </div>

            <div className="mkt2-soft">
              <div className="mkt2-softTitle">{t.contactTitle}</div>
              <div className="mkt2-contactItem">
                <div className="mkt2-contactLabel">{t.contactEmail}</div>
                <div className="mkt2-contactValue mkt2-ltr">
                  <a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a>
                </div>
              </div>
              <div className="mkt2-contactItem">
                <div className="mkt2-contactLabel">{t.contactPhone}</div>
                <div className="mkt2-contactValue mkt2-ltr">
                  <a href="tel:+962791752686">+962 79 175 2686</a>
                </div>
              </div>
              <div className="mkt2-contactItem">
                <div className="mkt2-contactLabel">{t.contactAddress}</div>
                <div className="mkt2-contactValue">{t.addressValue}</div>
              </div>
              <div className="mkt2-contactBtns">
                <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                  {t.ctaQuote}
                </a>
                <Link className="btn btn-ghost" to="/login">
                  {t.ctaStaff}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section ref={contactRef} id="contact" className="mkt2-contactAnchor" aria-hidden="true" />

        <footer className="mkt2-footer">
          <div className="mkt2-footerInner">
            <span>© {new Date().getFullYear()} Zomorod Medical Supplies LLC</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
