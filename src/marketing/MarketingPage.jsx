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
      "Reliable supply and consistent specifications for pharmacies and resellers — Jordan & Syria.",
    responseSla: "Quote response within 48 business hours.",

    // CTAs
    ctaStaff: "Staff Login",
    ctaWhatsapp: "Get a Quote",
    ctaBrowse: "Browse Products",

    // Top nav
    tabs: { about: "Company", products: "Products", careers: "Careers" },

    // Hero
    metrics: [
      { value: "Jordan & Syria", label: "Coverage" },
      { value: "Pharmacies & resellers", label: "Primary buyers" },
      { value: "Consistency-first", label: "Supply approach" },
    ],

    // Trust chips (used in hero)
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

    // Highlight cards (below hero)
    highlights: [
      {
        title: "Wide product selection",
        text: "Pilot lines across wound care, PPE, and baby-care essentials.",
      },
      {
        title: "Fast & reliable responses",
        text: "Clear turnaround times and practical communication for buyers.",
      },
      {
        title: "Support that fits buyers",
        text: "Quotations, availability checks, and basic documentation guidance where applicable.",
      },
    ],

    // Company section
    aboutTitle: "Professional medical supply solutions",
    aboutText:
      "Based in Amman, Zomorod supports pharmacies, clinics, laboratories, and resellers with documented, compliance-aware sourcing and dependable supply execution.",
    aboutPoints: [
      "Reliable supply with consistent specs",
      "Clear lead times and practical communication",
      "Documentation guidance as applicable (requirements vary by destination)",
    ],

    mdTitle: "Managing Director",
    mdName: "Mohammad Maani",
    mdRole: "Managing Director (MBA) • 12+ years of operational leadership",
    mdBody:
      "Leads sourcing discipline, partner coordination, and delivery execution across Jordan and regional markets.",
    mdLinkedInLabel: "LinkedIn",
    // Optional (leave empty if you don’t want it shown)
    linkedinUrl: "",
    linkedinText: "Connect with us for updates and professional inquiries.",
    linkedinCta: "Visit LinkedIn",

    servicesTitle: "Our services",
    services: [
      "Medical consumables procurement and supply planning",
      "Availability checks and volume-based quotations",
      "Documentation guidance (as applicable) and basic traceability",
      "Order fulfillment coordination and after-sales follow-up",
    ],

    sectorsTitle: "Who we serve",
    sectors: ["Pharmacies", "Resellers / distributors", "Clinics", "Laboratories"],

    // Products
    productsTitle: "Pilot product lines",
    productsSubtitle:
      "Category-level view — request a quotation for exact SKUs, packaging, and documentation.",

    // Careers
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

    formFirstName: "First Name*",
    formLastName: "Last Name*",
    formEmail: "Email*",
    formPhone: "Phone*",
    formCountry: "Country*",
    formCity: "City*",

    // Quote
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

    // Contact
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
    ctaBrowse: "تصفح المنتجات",

    tabs: { about: "الشركة", products: "المنتجات", careers: "الوظائف" },

    metrics: [
      { value: "الأردن وسوريا", label: "نطاق الخدمة" },
      { value: "الصيدليات والموزعون", label: "الجهات الأساسية" },
      { value: "ثبات المواصفات", label: "نهج التوريد" },
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

    highlights: [
      {
        title: "تشكيلة واسعة",
        text: "خطوط تجريبية تشمل العناية بالجروح وPPE ومنتجات الأطفال.",
      },
      {
        title: "استجابة سريعة",
        text: "مواعيد واضحة وتواصل عملي مع المشترين.",
      },
      {
        title: "دعم يناسب المشترين",
        text: "عروض أسعار، تأكيد التوفر، وإرشاد وثائقي عند الحاجة.",
      },
    ],

    aboutTitle: "حلول احترافية للمستلزمات الطبية",
    aboutText:
      "من مقرّنا في عمّان، ندعم الصيدليات والعيادات والمختبرات والموزعين عبر توريد قابل للتتبع ونهج يركز على الجودة والامتثال.",
    aboutPoints: [
      "توريد موثوق مع ثبات في المواصفات",
      "وضوح في أوقات التوريد وتواصل عملي",
      "إرشادات المستندات عند الاقتضاء (المتطلبات تختلف حسب الوجهة)",
    ],

    mdTitle: "المدير العام",
    mdName: "Mohammad Maani",
    mdRole: "المدير العام (MBA) • خبرة 12+ سنة في الإدارة التشغيلية",
    mdBody:
      "يقود الانضباط في التوريد وتنسيق الشركاء وتنفيذ التسليم داخل الأردن والأسواق الإقليمية.",
    mdLinkedInLabel: "لينكدإن",
    linkedinUrl: "",
    linkedinText: "تواصل معنا للاستفسارات والتحديثات المهنية.",
    linkedinCta: "زيارة لينكدإن",

    servicesTitle: "خدماتنا",
    services: [
      "توريد المستهلكات الطبية وتخطيط احتياجات الإمداد",
      "تأكيد التوفر وتقديم عروض حسب الكميات",
      "إرشادات المستندات (عند الاقتضاء) وتتبع أساسي",
      "تنسيق تنفيذ الطلبات والمتابعة بعد البيع",
    ],

    sectorsTitle: "الجهات التي نخدمها",
    sectors: ["الصيدليات", "الموزعون/الموردون", "العيادات", "المختبرات"],

    productsTitle: "خطوط المنتجات التجريبية",
    productsSubtitle:
      "عرض حسب الفئات — اطلب عرض سعر لتحديد الأصناف الدقيقة والتغليف والمتطلبات الوثائقية.",

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

    formFirstName: "الاسم الأول*",
    formLastName: "اسم العائلة*",
    formEmail: "البريد الإلكتروني*",
    formPhone: "الهاتف*",
    formCountry: "الدولة*",
    formCity: "المدينة*",

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
  en: [
    "High School",
    "Diploma",
    "Bachelor's Degree",
    "Master's Degree",
    "PhD",
    "Other",
  ],
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
  const [productFilter, setProductFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // IMPORTANT: do NOT auto-select. User must explicitly choose the job.
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
        if (res.ok && data.ok) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        } else {
          setJobs([]);
        }
      } catch {
        setJobs([]);
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

    const requiredKeys = [
      "jobId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "educationLevel",
      "country",
      "city",
    ];
    if (!requiredKeys.every((k) => form.get(k))) {
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

  const productFilters = PRODUCT_FILTERS[lang] || PRODUCT_FILTERS.en;

  return (
    <main className="mkt" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-topbar">
          <Link to="/" className="mkt-brand" aria-label="Zomorod Medical Supplies">
            <img className="mkt-logo" src="/logo.png" alt="" />
            <span className="mkt-brand-text">ZOMOROD</span>
          </Link>

          <nav className={`mkt-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
            <div className="mkt-navlinks">
              <button type="button" className="mkt-navlink" onClick={() => scrollToRef(companyRef)}>
                {t.tabs.about}
              </button>
              <button type="button" className="mkt-navlink" onClick={() => scrollToRef(productsRef)}>
                {t.tabs.products}
              </button>
              <button type="button" className="mkt-navlink" onClick={() => scrollToRef(careersRef)}>
                {t.tabs.careers}
              </button>
              <button type="button" className="mkt-navlink" onClick={() => scrollToRef(contactRef)}>
                {t.contactTitle}
              </button>
            </div>

            <div className="mkt-navactions">
              <Link to="/login" className="btn btn-ghost mkt-navbtn">
                {t.ctaStaff}
              </Link>
              <a
                className="btn btn-primary mkt-navbtn"
                href={whatsappQuoteHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.ctaWhatsapp}
              </a>
            </div>
          </nav>

          <div className="mkt-top-actions">
            <button
              type="button"
              className="btn btn-ghost mkt-lang"
              onClick={() => {
                setMenuOpen(false);
                setLang((prev) => (prev === "en" ? "ar" : "en"));
              }}
            >
              {t.langLabel}
            </button>

            <button
              type="button"
              className="btn btn-ghost mkt-burger"
              aria-label="Menu"
              aria-expanded={menuOpen ? "true" : "false"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>

        <div className="mkt-hero-main">
          <div className="mkt-hero-copy">
            <h1 className="mkt-h1">{t.brandName}</h1>
            <p className="mkt-sub">{t.tagline}</p>

            <div className="mkt-pill">{t.responseSla}</div>

            <div className="mkt-actions">
              <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                {t.ctaWhatsapp}
              </a>
              <button type="button" className="btn btn-ghost" onClick={() => scrollToRef(productsRef)}>
                {t.ctaBrowse}
              </button>
            </div>

            <div className="mkt-metrics">
              {t.metrics.map((m) => (
                <div key={m.label} className="mkt-metric card-soft">
                  <div className="mkt-metric-value">{m.value}</div>
                  <div className="mkt-metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="mkt-trust-row" aria-label={t.trustTitle}>
              {t.trustPoints.map((x) => (
                <span key={x.k} className="mkt-pill" title={x.v}>
                  {x.k}
                </span>
              ))}
            </div>
          </div>

          <div className="mkt-hero-art" aria-hidden="true">
            <picture>
              <source
                type="image/png"
                srcSet="/products/hero-illustration@2x.png 2x, /products/hero-illustration.png 1x"
              />
              <img
                className="mkt-hero-illustration"
                src="/products/hero-illustration.png"
                alt=""
                loading="eager"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = "/products/hero-illustration.svg";
                }}
              />
            </picture>
          </div>
        </div>

        <div className="mkt-highlights">
          {(t.highlights || []).map((h) => (
            <div key={h.title} className="mkt-highlight card-soft">
              <div className="mkt-highlight-title">{h.title}</div>
              <div className="mkt-highlight-text">{h.text}</div>
            </div>
          ))}
        </div>
      </header>

      <section ref={companyRef} id="company" className="mkt-section card">
        <div className="mkt-section-head">
          <h2 className="mkt-h2">{t.aboutTitle}</h2>
          <p className="mkt-muted">{t.aboutText}</p>
        </div>

        <ul className="mkt-bullets">
          {t.aboutPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <div className="hr" />

        <div className="mkt-service-grid">
          <div className="mkt-services">
            <h3 className="mkt-h3">{t.servicesTitle}</h3>
            <ul className="mkt-bullets">
              {t.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="mkt-sectors">
            <h3 className="mkt-h3">{t.sectorsTitle}</h3>
            <div className="mkt-sectors-grid">
              {t.sectors.map((s) => (
                <span key={s} className="mkt-chip">
                  {s}
                </span>
              ))}
            </div>

            <div className="mkt-md card-soft">
              <div className="mkt-md-quote">“{t.mdBody}”</div>
              <div className="mkt-md-meta">
                <span className="mkt-md-name">{t.mdName}</span>
                <span className="mkt-md-title">{t.mdRole}</span>
              </div>

              {t.linkedinUrl ? (
                <div style={{ marginTop: 10 }}>
                  <a className="mkt-linkedin" href={t.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <span className="mkt-linkedin-icon" aria-hidden="true">
                      <LinkedInIcon />
                    </span>
                    <span>{t.mdLinkedInLabel}</span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section ref={productsRef} id="products" className="mkt-section card">
        <div className="mkt-section-head">
          <h2 className="mkt-h2">{t.productsTitle}</h2>
          <p className="mkt-muted">{t.productsSubtitle}</p>
        </div>

        <div className="mkt-filters">
          {productFilters.map((f) => (
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
          {filteredProducts.map((p) => (
            <div key={p.id} className="mkt-product card-soft">
              <div className="mkt-product-media">
                <img
                  src={p.imgPng}
                  srcSet={`${p.imgPng} 1x, ${p.imgPng2x} 2x`}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (p.imgSvg) e.currentTarget.src = p.imgSvg;
                  }}
                />
              </div>

              <div className="mkt-product-body">
                <div className="mkt-product-title">{p.title}</div>
                <div className="mkt-product-text">{p.body}</div>

                <div className="mkt-tags">
                  {p.tags.map((x) => (
                    <span key={x} className="mkt-tag">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section ref={careersRef} id="careers" className="mkt-section card">
        <div className="mkt-section-head">
          <h2 className="mkt-h2">{t.careersTitle}</h2>
          <p className="mkt-muted">{t.careersSubtitle}</p>
        </div>

        <div className="mkt-careers-grid">
          <div className="mkt-jobs card-soft">
            {jobsLoading ? (
              <div className="mkt-muted">{t.jobsLoading}</div>
            ) : jobs.length === 0 ? (
              <div className="mkt-muted">{t.jobsEmpty}</div>
            ) : (
              <div className="mkt-job-list">
                {jobs.map((job) => {
                  const plain = stripHtml(job.description || "");
                  const expanded = !!expandedJobs[job.id];
                  const snippet = expanded ? plain : truncateWords(plain, 26);

                  return (
                    <div key={job.id} className="mkt-job">
                      <div className="mkt-job-top">
                        <div>
                          <div className="mkt-job-title">{job.title}</div>
                          <div className="mkt-job-meta">
                            {job.country}
                            {job.city ? ` • ${job.city}` : ""}
                            {job.type ? ` • ${job.type}` : ""}
                          </div>
                        </div>

                        <button type="button" className="btn btn-ghost" onClick={() => handleSelectJob(job.id)}>
                          {t.selectJob}
                        </button>
                      </div>

                      <div className="mkt-job-desc">{snippet}</div>

                      {plain && plain.split(/\s+/).filter(Boolean).length > 26 ? (
                        <button
                          type="button"
                          className="mkt-readmore"
                          onClick={() =>
                            setExpandedJobs((prev) => ({ ...prev, [job.id]: !prev[job.id] }))
                          }
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

          <div ref={applyFormRef} className="mkt-apply card-soft">
            <div className="mkt-apply-head">
              <div className="mkt-h3">{t.apply}</div>
              <div className="mkt-muted">
                {t.selectedJobLabel}: <strong>{selectedJob ? selectedJob.title : "—"}</strong>
              </div>
            </div>

            {applyMsg ? <div className="mkt-success">{applyMsg}</div> : null}
            {applyErr ? <div className="mkt-error">{applyErr}</div> : null}

            <form className="mkt-form" onSubmit={onApply}>
              <div className="mkt-form-row">
                <label>
                  <span>{t.formFirstName}</span>
                  <input name="firstName" required />
                </label>
                <label>
                  <span>{t.formLastName}</span>
                  <input name="lastName" required />
                </label>
              </div>

              <div className="mkt-form-row">
                <label>
                  <span>{t.formEmail}</span>
                  <input type="email" name="email" required />
                </label>
                <label>
                  <span>{t.formPhone}</span>
                  <input name="phone" required />
                </label>
              </div>

              <div className="mkt-form-row">
                <label>
                  <span>{t.educationPlaceholder}*</span>
                  <select name="educationLevel" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {(EDUCATION_LEVEL_OPTIONS[lang] || EDUCATION_LEVEL_OPTIONS.en).map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{t.formCountry}</span>
                  <input name="country" required />
                </label>
              </div>

              <div className="mkt-form-row">
                <label>
                  <span>{t.formCity}</span>
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

      <section ref={quoteRef} id="quote" className="mkt-section card">
        <div className="mkt-section-head">
          <h2 className="mkt-h2">{t.quoteTitle}</h2>
          <p className="mkt-muted">{t.quoteSubtitle}</p>
        </div>

        <div className="mkt-quote-grid">
          <div className="card-soft">
            <h3 className="mkt-h3">{t.quoteChecklistTitle}</h3>
            <ul className="mkt-bullets">
              {t.quoteChecklist.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>

            <div style={{ marginTop: 12 }}>
              <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                {t.ctaWhatsapp}
              </a>
            </div>
          </div>

          {t.linkedinUrl ? (
            <div className="card-soft">
              <h3 className="mkt-h3">LinkedIn</h3>
              <p className="mkt-muted">{t.linkedinText}</p>
              <a className="mkt-linkedin" href={t.linkedinUrl} target="_blank" rel="noopener noreferrer">
                <span className="mkt-linkedin-icon" aria-hidden="true">
                  <LinkedInIcon />
                </span>
                <span>{t.linkedinCta}</span>
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section ref={contactRef} id="contact" className="mkt-section card">
        <div className="mkt-section-head">
          <h2 className="mkt-h2">{t.contactTitle}</h2>
        </div>

        <div className="mkt-contact-grid">
          <div className="card-soft">
            <div className="mkt-contact-item">
              <div className="mkt-contact-label">{t.contactEmail}</div>
              <div className="mkt-contact-value">
                <a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a>
              </div>
            </div>

            <div className="mkt-contact-item">
              <div className="mkt-contact-label">{t.contactPhone}</div>
              <div className="mkt-contact-value">
                <a href="tel:+962791752686">+962 79 175 2686</a>
              </div>
            </div>

            <div className="mkt-contact-item">
              <div className="mkt-contact-label">{t.contactAddress}</div>
              <div className="mkt-contact-value">{t.addressValue}</div>
            </div>

            <div className="mkt-contact-actions">
              <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                {t.ctaWhatsapp}
              </a>
              <Link className="btn btn-ghost" to="/login">
                {t.ctaStaff}
              </Link>
            </div>
          </div>

          <div className="card-soft mkt-contact-note">
            <div className="mkt-muted">
              {lang === "ar"
                ? "ملاحظة: نركز على توريد منتظم بمواصفات ثابتة. للطلبات الكبيرة أو المتطلبات الوثائقية، يرجى إرسال التفاصيل عبر واتساب."
                : "Note: We focus on consistent supply with stable specifications. For large orders or documentation needs, send details via WhatsApp."}
            </div>
          </div>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-footer-inner">
          <span>© {new Date().getFullYear()} Zomorod Medical Supplies LLC</span>
        </div>
      </footer>
    </main>
  );
}
