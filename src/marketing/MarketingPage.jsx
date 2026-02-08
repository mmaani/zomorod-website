import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const COPY = {
  en: {
    dir: "ltr",
    langLabel: "عربي",
    brandName: "Zomorod Medical Supplies LLC",
    tagline:
      "Reliable supply and consistent specifications for professional healthcare buyers in Jordan and Syria.",
    // Best-practice CTA for B2B distributors is “Request a Quote”
    ctaPrimary: "Request a Quote",
    ctaStaff: "Staff Login",
    ctaCall: "Call",
    ctaEmail: "Email",
    responseTime: "We respond within 48 business hours.",
    metrics: [
      { value: "Jordan & Syria", label: "Coverage" },
      { value: "Pharmacies & resellers", label: "Primary buyers" },
      { value: "Consistency-first", label: "Operating approach" },
    ],
    tabs: { about: "Company", products: "Products", careers: "Careers" },
    aboutTitle: "Professional medical supply solutions",
    aboutText:
      "Based in Amman, Zomorod supports pharmacies, clinics, laboratories, and resellers with disciplined sourcing, clear lead times, and compliance-aware documentation guidance (as applicable).",
    aboutPoints: [
      "Reliable supply and consistent specifications",
      "Documentation guidance as applicable",
      "Traceability when available from suppliers",
    ],
    trustTitle: "Trust & operating principles",
    trustPoints: [
      "Clear lead times and proactive buyer communication",
      "Quality-focused sourcing with consistency checks",
      "Regulatory requirements vary by destination and product category",
      "We serve professional buyers — not medical advice",
    ],
    mdTitle: "Managing Director — Mohammad Maani (MBA)",
    mdBody:
      "Managing Director with 12+ years of experience across private sector and international operations. Focused on disciplined sourcing, partner coordination, and reliable fulfillment for professional buyers.",
    mdLinkedInLabel: "LinkedIn profile",
    servicesTitle: "Our services",
    services: [
      "Medical consumables procurement and supply planning",
      "Support for tenders and institutional sourcing requirements",
      "Order fulfillment coordination and after-sales follow-up",
      "Product and document traceability for compliance workflows",
    ],
    productsTitle: "Our product categories",
    productsSubtitle:
      "We publish categories (not a full SKU catalog). Specific items depend on your request, quantities, and destination requirements.",
    sectorsTitle: "Who we serve",
    sectors: ["Pharmacies", "Clinics", "Laboratories", "Resellers / distributors"],
    careersTitle: "Recruitment announcements",
    careersSubtitle: "Open vacancies published from CRM. Apply directly below.",
    jobsLoading: "Loading opportunities...",
    jobsEmpty: "No openings announced at the moment.",
    selectJob: "Select this job",
    selected: "Selected",
    apply: "Apply now",
    submitting: "Submitting...",
    applySuccess: "Your application has been submitted successfully.",
    applyError: "Please fill all required fields.",
    selectJobFirst: "Please select a job first.",
    applyingFor: "You are applying for:",
    chooseAbove: "Please select a job from the list above before filling the form.",
    readMore: "Read more",
    readLess: "Show less",
    educationPlaceholder: "Education level",
    cv: "CV (required)",
    cover: "cover letter (optional)",
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
    tagline: "توريد موثوق ومواصفات ثابتة للمشترين المهنيين في الأردن وسوريا.",
    ctaPrimary: "طلب عرض سعر",
    ctaStaff: "دخول الموظفين",
    ctaCall: "اتصال",
    ctaEmail: "البريد",
    responseTime: "نرد خلال 48 ساعة عمل.",
    metrics: [
      { value: "الأردن وسوريا", label: "نطاق التغطية" },
      { value: "الصيدليات والموزعون", label: "العملاء الأساسيون" },
      { value: "ثبات المواصفات", label: "نهج العمل" },
    ],
    tabs: { about: "الشركة", products: "المنتجات", careers: "الوظائف" },
    aboutTitle: "حلول احترافية للمستلزمات الطبية",
    aboutText:
      "من مقرّنا في عمّان، ندعم الصيدليات والعيادات والمختبرات والموزعين عبر توريد منضبط، وضوح وقت التوريد، وإرشادات مستندات تنظيمية (عند الاقتضاء).",
    aboutPoints: ["توريد موثوق ومواصفات ثابتة", "إرشادات مستندات عند الاقتضاء", "تتبع عند توفره من المورد"],
    trustTitle: "الثقة ومبادئ التشغيل",
    trustPoints: [
      "وضوح وقت التوريد وتواصل استباقي مع العميل",
      "توريد يركز على الجودة مع فحص ثبات المواصفات",
      "المتطلبات التنظيمية تختلف حسب الوجهة وفئة المنتج",
      "نخدم المشترين المهنيين — ليس نصيحة طبية",
    ],
    mdTitle: "المدير العام — محمد المعاني (MBA)",
    mdBody:
      "مدير عام بخبرة تزيد عن 12 عامًا في القطاع الخاص والعمليات الدولية. يركز على انضباط التوريد، تنسيق الشركاء، وتنفيذ موثوق للمشترين المهنيين.",
    mdLinkedInLabel: "حساب لينكدإن",
    servicesTitle: "خدماتنا",
    services: [
      "توريد المستهلكات الطبية وتخطيط احتياجات الإمداد",
      "دعم المناقصات ومتطلبات الشراء المؤسسي",
      "تنسيق تنفيذ الطلبات والمتابعة بعد البيع",
      "إتاحة تتبع المنتجات والوثائق ضمن مسارات الامتثال",
    ],
    productsTitle: "فئات منتجاتنا",
    productsSubtitle:
      "نعرض فئات وليس كتالوج SKU كامل. الأصناف تعتمد على الطلب والكميات ومتطلبات الوجهة.",
    sectorsTitle: "الجهات التي نخدمها",
    sectors: ["الصيدليات", "العيادات", "المختبرات", "الموزعون"],
    careersTitle: "إعلانات التوظيف",
    careersSubtitle: "الوظائف المفتوحة المنشورة من CRM. يمكن التقديم مباشرة.",
    jobsLoading: "جاري تحميل الفرص...",
    jobsEmpty: "لا توجد وظائف معلنة حالياً.",
    selectJob: "اختيار هذه الوظيفة",
    selected: "تم الاختيار",
    apply: "قدّم الآن",
    submitting: "جاري الإرسال...",
    applySuccess: "تم إرسال طلبك بنجاح.",
    applyError: "يرجى تعبئة جميع الحقول المطلوبة.",
    selectJobFirst: "يرجى اختيار الوظيفة أولاً.",
    applyingFor: "أنت تتقدم لوظيفة:",
    chooseAbove: "يرجى اختيار وظيفة من القائمة أعلاه قبل تعبئة الطلب.",
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
    { title: "Baby care", body: "Feeding bottles, silicone pacifiers, and selected baby-care items." },
    { title: "Oral care", body: "Toothpaste, toothbrushes, and selected oral-care items on request." },
    { title: "PPE (selected)", body: "Selected protective items for clinical and operational environments." },
    { title: "Hygiene & infection control", body: "Selected hygiene and infection-prevention items." },
    { title: "Clinic consumables", body: "Routine clinic consumables and exam-room essentials (selected)." },
    { title: "Lab consumables (selected)", body: "Selected lab consumables on request with spec matching support." },
    { title: "Custom sourcing", body: "Request-based sourcing for institutional and reseller needs." },
  ],
  ar: [
    { title: "عناية بالأطفال", body: "رضّاعات ولهايات سيليكون وأصناف مختارة للعناية بالأطفال." },
    { title: "عناية فموية", body: "معجون وفرش أسنان وأصناف عناية فموية مختارة عند الطلب." },
    { title: "معدات وقاية (مختارة)", body: "مستلزمات وقاية مختارة للبيئات الطبية والتشغيلية." },
    { title: "نظافة ومكافحة العدوى", body: "أصناف نظافة ووقاية من العدوى مختارة." },
    { title: "مستهلكات العيادات", body: "مستهلكات عيادات روتينية وأصناف فحص أساسية (مختارة)." },
    { title: "مستهلكات المختبر (مختارة)", body: "أصناف مختبر مختارة عند الطلب مع دعم مطابقة المواصفات." },
    { title: "توريد حسب الطلب", body: "توريد حسب الطلب لاحتياجات المؤسسات والموزعين." },
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

function makeWhatsAppLink(phoneE164DigitsOnly, text) {
  const msg = encodeURIComponent(String(text || ""));
  return `https://wa.me/${phoneE164DigitsOnly}?text=${msg}`;
}

export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("about");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // User must explicitly pick a job before applying
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({});
  const applyFormRef = useRef(null);

  const t = useMemo(() => COPY[lang], [lang]);

  const selectedJob = useMemo(
    () => jobs.find((j) => String(j.id) === String(selectedJobId)) || null,
    [jobs, selectedJobId]
  );

  const quoteMessage = useMemo(() => {
    if (lang === "ar") {
      return [
        "مرحباً، أود طلب عرض سعر.",
        "نوع الجهة: (صيدلية / موزع)",
        "فئة المنتج: ",
        "المواصفات/التعبئة: ",
        "الكمية: ",
        "مدينة التسليم: (الأردن / سوريا)",
      ].join("\n");
    }
    return [
      "Hello, I'd like to request a quote.",
      "Buyer type: (Pharmacy / Reseller)",
      "Product category:",
      "Specification / pack size:",
      "Quantity:",
      "Delivery city (Jordan / Syria):",
    ].join("\n");
  }, [lang]);

  const whatsappQuoteUrl = useMemo(() => makeWhatsAppLink("962791752686", quoteMessage), [quoteMessage]);

  useEffect(() => {
    (async () => {
      setJobsLoading(true);
      try {
        const res = await fetch("/api/recruitment?resource=jobs");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const items = Array.isArray(data.jobs) ? data.jobs : [];
          setJobs(items);
        }
      } finally {
        setJobsLoading(false);
      }
    })();
  }, []);

  async function onApply(e) {
    e.preventDefault();
    setApplyErr("");
    setApplyMsg("");

    if (!selectedJobId) {
      setApplyErr(t.selectJobFirst);
      applyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    // Ensure jobId is exactly the selected job (ignore any stale hidden input)
    form.set("jobId", selectedJobId);

    const requiredKeys = ["jobId", "firstName", "lastName", "email", "phone", "educationLevel", "country", "city", "cv"];
    for (const k of requiredKeys) {
      const v = form.get(k);
      if (!v || (typeof v === "string" && !v.trim())) {
        setApplyErr(t.applyError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recruitment?resource=apply", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.detail || data.error || "Failed to submit application");
      if (data?.sheetSync?.ok === false) {
        throw new Error(data?.sheetSync?.error || "Application saved, but Google Sheet sync failed");
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

  return (
    <main className="mkt-page" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-hero-top">
          <img className="mkt-logo" src="/logo.png" alt="Zomorod logo" />
          <button type="button" className="btn btn-ghost mkt-lang" onClick={() => setLang((s) => (s === "en" ? "ar" : "en"))}>
            {t.langLabel}
          </button>
        </div>

        <h1 className="mkt-title">{t.brandName}</h1>
        <p className="mkt-tagline">{t.tagline}</p>

        <div className="mkt-trust-strip" aria-label="Service promise">
          <span className="mkt-pill">{t.responseTime}</span>
          <span className="mkt-pill">{lang === "ar" ? "الأردن أولاً، سوريا ثانياً" : "Jordan first, Syria second"}</span>
          <span className="mkt-pill">{lang === "ar" ? "توريد يركز على ثبات المواصفات" : "Consistency-first sourcing"}</span>
        </div>

        <div className="mkt-cta-row">
          <a className="btn btn-primary mkt-cta" href={whatsappQuoteUrl} target="_blank" rel="noopener noreferrer">
            {t.ctaPrimary}
          </a>
          <Link to="/login" className="btn mkt-cta">
            {t.ctaStaff}
          </Link>
        </div>

        <div className="mkt-hero-mini">
          <a className="mkt-mini-link" href="tel:+962791752686">
            {t.ctaCall}: +962 79 175 2686
          </a>
          <a className="mkt-mini-link" href="mailto:info@zomorodmedical.com">
            {t.ctaEmail}: info@zomorodmedical.com
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
            <ul className="mkt-list">
              {t.aboutPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <div className="mkt-split">
              <article className="mkt-card">
                <div className="mkt-card-title">{t.trustTitle}</div>
                <ul className="mkt-list">
                  {t.trustPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>

              <article className="mkt-card">
                <div className="mkt-card-title">{t.mdTitle}</div>
                <p className="mkt-card-body">{t.mdBody}</p>
                <a className="mkt-inline-btn" href="https://www.linkedin.com/in/mohammadamaani/" target="_blank" rel="noopener noreferrer">
                  {t.mdLinkedInLabel}
                </a>
              </article>
            </div>
          </div>
        ) : null}

        {activeTab === "products" ? (
          <div className="mkt-tab-panel">
            <h2 className="mkt-h2">{t.productsTitle}</h2>
            <p className="mkt-p">{t.productsSubtitle}</p>
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

            {jobsLoading ? (
              <p className="mkt-p">{t.jobsLoading}</p>
            ) : (
              <div className="mkt-jobs-list">
                {jobs.map((job) => (
                  <article key={job.id} className="mkt-job-card">
                    <div className="mkt-job-head">
                      <div className="mkt-card-title">{job.title}</div>
                      {selectedJobId === String(job.id) ? <span className="mkt-selected-badge">{t.selected}</span> : null}
                    </div>

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

                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => {
                        setSelectedJobId(String(job.id));
                        setTimeout(() => applyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                    >
                      {t.selectJob}
                    </button>
                  </article>
                ))}
                {!jobs.length ? <p className="mkt-p">{t.jobsEmpty}</p> : null}
              </div>
            )}

            {jobs.length ? (
              <form ref={applyFormRef} className="mkt-apply-form" onSubmit={onApply}>
                <div className="banner" style={{ marginBottom: 12 }}>
                  {selectedJob ? (
                    <>
                      <strong style={{ marginInlineEnd: 8 }}>{t.applyingFor}</strong>
                      <span>{selectedJob.title}</span>
                    </>
                  ) : (
                    <span>{t.chooseAbove}</span>
                  )}
                </div>

                <input type="hidden" name="jobId" value={selectedJobId || ""} />

                <fieldset disabled={!selectedJobId || submitting} style={{ border: 0, padding: 0, margin: 0 }}>
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

                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? t.submitting : t.apply}
                  </button>

                  {applyErr ? <div className="banner">{applyErr}</div> : null}
                  {applyMsg ? <div className="mkt-success">{applyMsg}</div> : null}
                </fieldset>
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
              {t.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
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

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.contactTitle}</h2>
        <div className="mkt-contact">
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactEmail}</span>
            <a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a>
          </div>
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactPhone}</span>
            <a href="tel:+962791752686">+962 79 175 2686</a>
          </div>
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{t.contactAddress}</span>
            <span>{t.addressValue}</span>
          </div>

          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{lang === "ar" ? "عرض سعر" : "Quote"}</span>
            <a href={whatsappQuoteUrl} target="_blank" rel="noopener noreferrer">
              {lang === "ar" ? "افتح واتساب برسالة جاهزة" : "Open WhatsApp with a prefilled request"}
            </a>
          </div>

          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{lang === "ar" ? "لينكدإن" : "LinkedIn"}</span>
            <a href="https://www.linkedin.com/in/mohammadamaani/" target="_blank" rel="noopener noreferrer">
              Mohammad Maani
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
