import { useMemo, useState } from "react";
import logo from "./logo.png";
import "./styles.css";

export default function App() {
  const [lang, setLang] = useState("en");
  const isAr = lang === "ar";

  const content = useMemo(() => {
    const en = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "Medical consumables sourcing, quality evaluation & distribution — Jordan & Syria.",

      // Navigation
      nav: {
        home: "Home",
        products: "Products",
        leadership: "Leadership",
        contact: "Contact",
        approach: "Approach",
        serve: "Who We Serve",
        compliance: "Compliance",
      },

      // Hero
      heroTitle: "Medical consumables sourcing, quality evaluation, and distribution — Jordan & Syria.",
      heroBody:
  "We support private clinics, pharmacies, laboratories, and healthcare distributors across Jordan and Syria with carefully selected medical consumer goods. Each request is evaluated based on product specifications, quality consistency, documentation readiness, regulatory requirements, and total landed cost—allowing us to provide reliable supply with competitive, volume-based pricing.",
      heroPrimary: "Email us",
      heroSecondary: "Call us",

      highlightsTitle: "Why Zomorod",
      highlights: [
        "Clear availability and lead-time communication",
        "Quality-focused sourcing and careful handling",
        "Fast response via phone, email, and WhatsApp",
      ],

      // Market + sourcing
      marketTitle: "Market Focus",
      marketBody:
"Jordan and Syria rely significantly on imported medical consumables across the private healthcare sector. Zomorod Medical Supplies LLC focuses on serving local private-sector demand with practical, small-scale fulfillment and clear lead-time communication.",
      sourcingTitle: "Sourcing Approach",
      sourcingBody:
        "We evaluate quality consistency, documentation readiness, regulatory requirements, logistics feasibility, and market suitability when selecting supply options. Documentation support is provided where applicable.",

      // Quality & Value
      qvTitle: "Quality & Value Methodology",
      qvBody:
        "We compare sourcing options using defined criteria: product specifications, quality consistency, documentation readiness, regulatory requirements, and total landed cost. This helps us provide reliable products with competitive quotes based on volume and delivery needs.",

      // NEW: Who we serve
      serveTitle: "Who We Serve",
      serveBody:
"We support professional healthcare buyers and distribution channels across Jordan and Syria. If you purchase medical consumables for your facility or customers, we can support you with availability confirmation, documentation guidance (where applicable), and competitive quotes.",
serveList: ["Private clinics", "Pharmacies", "Laboratories", "Healthcare distributors"],
    serviceAreaLabel: "Service Areas",
    serviceAreaValue: "Jordan & Syria",

      // How to order
      orderTitle: "How to Order",
      orderSteps: [
  "Send your request: product, quantity, and delivery location (Jordan or Syria) by email or WhatsApp.",
  "We confirm availability, documentation requirements (where applicable), pricing, and estimated lead time.",
  "We arrange delivery and handover based on the agreed location and timeline.",
],

      // Products (6 + additional generic categories)
      productsTitle: "Products",
      productsSubtitle: "Current products (small scale)",
      products: [
        "Baby feeding bottle",
        "Silicone pacifier",
        "Personal protection products",
        "Toothpaste",
        "Toothbrushes",
        "Selected oral-care items (on request)",
      ],
      additionalTitle: "Additional medical consumables (on request / expanding)",
      additional: [
        "Wound care consumables",
        "Examination & clinic consumables",
        "Personal protective equipment (PPE)",
        "Laboratory consumables (selected items)",
        "Hygiene and infection-prevention items",
      ],
      productsNote:
        "Availability depends on demand, quantities, and regulatory requirements. Contact us for a quote and lead time.",

      // Leadership
      aboutTitle: "Leadership",
      mdTitle: "Managing Director — Mr. Mohammad Maani (MBA)",
      mdBio:
        "MBA-qualified Managing Director with 12+ years of experience across the private sector and international NGOs (INGOs). Experienced in the medical field and in leading operations and partnerships across the MENA region and West Africa.",
      mdEmailLabel: "Email",
      mdEmail: "m.maani@zomorodmedical.com",

      osamaTitle: "Technical Expert — Dr. Osama",
      osamaBio:
        "PharmaD with 15+ years of professional experience as a medical representative. Worked with well-known pharmaceutical companies across psychiatric medications, antibiotics, dietary supplements, and medical cosmetic products (body, hair, and dental care).",
      osamaEmailLabel: "Email",
      osamaEmail: "o.nbhan@zomorodmedical.com",

      // Contact
      contactTitle: "Contact",
      locationLabel: "Location",
      locationValue: "Amman, Jordan",
      locationDetails: "Amman, Sport City, Jordan",
      zipLabel: "Zip Code",
      zipValue: "11196",
      coordsLabel: "Coordinates",
      coordsValue: `31°59'8"N 35°53'52"E`,
      mapOpenLabel: "Open in Google Maps",

      phonesLabel: "Phone",
      emailsLabel: "Email",
      companyPhoneLabel: "Company",
      doctorPhoneLabel: "Dr. Osama",
      infoEmail: "info@zomorodmedical.com",

      // CTA
      ctaTitle: "Request a Quote",
      ctaBody:
        "Send your required items, quantities, and delivery location to info@zomorodmedical.com and we will respond promptly.",

      // Availability
      noteTitle: "Availability",
      noteBody:
        "We operate at a small scale and supply based on demand. For inquiries, please contact us by phone or email.",

      // Compliance
      complianceTitle: "Regulatory & Compliance Notice",
        complianceBody:
        "Zomorod Medical Supplies LLC supplies medical consumer goods and related products for customers in Jordan and Syria. Product availability, specifications, labeling, and import/distribution requirements may vary by product and destination. We provide information upon request and support customers with documentation where applicable. This website is for general information only and does not constitute medical advice.",

      contactNote: "Prefer WhatsApp? Tap the button to message us instantly.",
      footer: `© ${new Date().getFullYear()} Zomorod Medical Supplies LLC. All rights reserved.`,

      langLabel: "Language",
      en: "EN",
      ar: "AR",
    };

    const ar = {
      brand: "Zomorod Medical Supplies LLC",
      tagline:   "توريد وتقييم جودة وتوزيع المستلزمات الطبية الاستهلاكية — الأردن وسوريا.",
      nav: {
        home: "الرئيسية",
        products: "المنتجات",
        leadership: "الإدارة",
        contact: "التواصل",
        approach: "المنهجية",
        serve: "من نخدم",
        compliance: "الالتزام",
      },

      heroTitle:   "توريد وتقييم جودة وتوزيع المستلزمات الطبية الاستهلاكية — الأردن وسوريا.",
      heroBody:
  "ندعم العيادات الخاصة والصيدليات والمختبرات وموزّعي المستلزمات الطبية في الأردن وسوريا من خلال توريد منتجات طبية استهلاكية مختارة بعناية. يتم تقييم كل طلب وفق المواصفات الفنية، وثبات الجودة، وجاهزية المستندات، والمتطلبات التنظيمية، والتكلفة الإجمالية بعد الشحن، مما يتيح توفير منتجات موثوقة بأسعار تنافسية حسب الكمية.",
      heroPrimary: "راسلنا بالبريد",
      heroSecondary: "اتصل بنا",

      highlightsTitle: "لماذا زمرد؟",
      highlights: [
        "وضوح في التوفر ووقت التوريد",
        "اهتمام بالجودة وحسن التعامل مع المنتجات",
        "استجابة سريعة عبر الهاتف والبريد وواتساب",
      ],

      marketTitle: "السوق المستهدف",
      marketBody:
  "يعتمد القطاع الصحي الخاص في الأردن وسوريا بشكل كبير على استيراد المستلزمات الطبية الاستهلاكية. تركز زمرد للمستلزمات الطبية على تلبية الطلب المحلي في القطاع الخاص من خلال توريد عملي وعلى نطاق مناسب مع وضوح في وقت التوريد.",
      sourcingTitle: "نهج التوريد",
      sourcingBody:
        "نعتمد على تقييم ثبات الجودة وجاهزية المستندات والمتطلبات التنظيمية وجدوى الخدمات اللوجستية وملاءمة السوق عند اختيار خيارات التوريد. ويتم دعم العملاء بالمستندات عند الاقتضاء.",

      qvTitle: "منهجية الجودة والقيمة",
      qvBody:
        "نقارن خيارات التوريد وفق معايير واضحة تشمل المواصفات، وثبات الجودة، وجاهزية المستندات، والمتطلبات التنظيمية، والتكلفة الإجمالية بعد الشحن. يتيح ذلك تقديم منتجات موثوقة مع عروض أسعار تنافسية حسب الكمية وموقع التسليم.",

      // NEW: Who we serve
      serveTitle: "من نخدم",
      serveBody:
        "نخدم المشترين المهنيين وقنوات التوزيع في الأردن وسوريا. إذا كنت تشتري مستلزمات طبية لمرفقك أو لعملائك، يمكننا دعمك بتأكيد التوفر، وإرشادات المستندات (عند الاقتضاء)، وعروض أسعار تنافسية.",
      serveList: ["العيادات الخاصة", "الصيدليات", "المختبرات", "موزعو المستلزمات الطبية"],
      serviceAreaLabel: "نطاق الخدمة",
      serviceAreaValue: "الأردن وسوريا",

      orderTitle: "كيفية الطلب",
      orderSteps: [
            "إرسال الطلب: نوع المنتج والكمية وموقع التسليم (الأردن أو سوريا) عبر البريد أو واتساب.",
            "نؤكد التوفر ومتطلبات المستندات (عند الاقتضاء) والسعر ووقت التوريد المتوقع.",
            "ترتيب التسليم والتسليم النهائي حسب الموقع والجدول المتفق عليه.",
          ],

      productsTitle: "المنتجات",
      productsSubtitle: "المنتجات الحالية (على نطاق صغير)",
      products: [
        "رضّاعة أطفال",
        "لهاية سيليكون",
        "منتجات حماية شخصية (واقيات)",
        "معجون أسنان",
        "فرش أسنان",
        "منتجات عناية فموية مختارة (عند الطلب)",
      ],
      additionalTitle: "مستلزمات طبية إضافية (عند الطلب / ضمن التوسع)",
      additional: [
        "مستلزمات العناية بالجروح",
        "مستلزمات العيادات والفحص",
        "معدات الوقاية الشخصية (PPE)",
        "مستلزمات مختبرات (مواد مختارة)",
        "مستلزمات النظافة والوقاية من العدوى",
      ],
      productsNote:
        "يعتمد التوفر على الطلب والكميات والمتطلبات التنظيمية. تواصل معنا للحصول على عرض سعر ووقت توريد.",

      aboutTitle: "الإدارة",
      mdTitle: "المدير العام — السيد محمد المعاني (MBA)",
      mdBio:
        "مدير عام حاصل على ماجستير إدارة أعمال (MBA) بخبرة تزيد عن 12 عامًا في القطاع الخاص والمنظمات الدولية غير الحكومية. لديه خبرة في المجال الطبي وقيادة العمليات وبناء الشراكات في منطقة الشرق الأوسط وشمال أفريقيا وغرب أفريقيا.",
      mdEmailLabel: "البريد الإلكتروني",
      mdEmail: "m.maani@zomorodmedical.com",

      osamaTitle: "الخبير الفني - د. أسامة",
      osamaBio:
        "حاصل على بكالوريس دكتور في الصيدلة بخبرة مهنية تزيد عن 15 عامًا كمندوب طبي. عمل مع شركات دوائية معروفة في مجالات تشمل أدوية الطب النفسي، والمضادات الحيوية، والمكملات الغذائية، ومنتجات التجميل الطبية (العناية بالجسم والشعر والأسنان).",
      osamaEmailLabel: "البريد الإلكتروني",
      osamaEmail: "o.nbhan@zomorodmedical.com",

      contactTitle: "التواصل",
      locationLabel: "الموقع",
      locationValue: "عمّان، الأردن",
      locationDetails: "عمّان، المدينة الرياضية، الأردن",
      zipLabel: "الرمز البريدي",
      zipValue: "11196",
      coordsLabel: "الإحداثيات",
      coordsValue: `31°59'8"N 35°53'52"E`,
      mapOpenLabel: "فتح على خرائط Google",

      phonesLabel: "الهاتف",
      emailsLabel: "البريد الإلكتروني",
      companyPhoneLabel: "هاتف الشركة",
      doctorPhoneLabel: "د. أسامه",
      infoEmail: "info@zomorodmedical.com",

      ctaTitle: "طلب عرض سعر",
      ctaBody:
        "أرسل الأصناف المطلوبة والكميات وموقع التسليم إلى info@zomorodmedical.com وسنقوم بالرد في أقرب وقت.",

      noteTitle: "التوفر",
      noteBody:
        "نعمل حاليًا على نطاق صغير ويتم التوريد حسب الطلب. للاستفسارات، يرجى التواصل عبر الهاتف أو البريد الإلكتروني.",

      complianceTitle: "إشعار تنظيمي والالتزام",
      complianceBody:
  "تقوم Zomorod Medical Supplies LLC بتوريد المنتجات الطبية الاستهلاكية وما يرتبط بها لعملائها في الأردن وسوريا. قد تختلف التوفر والمواصفات والملصقات ومتطلبات الاستيراد/التوزيع حسب المنتج ووجهة التسليم. نقدم المعلومات عند الطلب وندعم العملاء بالمستندات عند الاقتضاء. هذا الموقع مخصص للمعلومات العامة فقط ولا يُعد نصيحة طبية.",
serviceAreaLabel: "نطاق الخدمة",
serviceAreaValue: "الأردن وسوريا",
        
      contactNote: "تفضّل واتساب؟ اضغط الزر لإرسال رسالة مباشرة.",
      footer: `© ${new Date().getFullYear()} Zomorod Medical Supplies LLC. جميع الحقوق محفوظة.`,

      langLabel: "اللغة",
      en: "EN",
      ar: "AR",
    };

    return isAr ? ar : en;
  }, [isAr]);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const header = document.querySelector(".header");
    const headerH = header ? header.offsetHeight : 0;

    const y = el.getBoundingClientRect().top + window.pageYOffset - (headerH + 18);
    window.scrollTo({ top: y, behavior: "smooth" });
  };



  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} className="page">
      <header className="header">
        <div
          className="brand"
          onClick={() => scrollToId("home")}
          role="button"
          tabIndex={0}
        >
          <img src={logo} alt="Zomorod Medical Supplies LLC" className="brand__logo" />
          <div>
            <h1 className="brand__title">{content.brand}</h1>
            <p className="brand__tagline">{content.tagline}</p>
          </div>
        </div>

        <div className="header__right">
          <nav className="nav" aria-label="Primary">
            <button className="nav__link" type="button" onClick={() => scrollToId("home")}>
              {content.nav.home}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("products")}>
              {content.nav.products}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("approach")}>
              {content.nav.approach}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("serve")}>
              {content.nav.serve}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("leadership")}>
              {content.nav.leadership}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("contact")}>
              {content.nav.contact}
            </button>
            <button className="nav__link" type="button" onClick={() => scrollToId("compliance")}>
              {content.nav.compliance}
            </button>
          </nav>

          <div className="lang">
            <span className="lang__label">{content.langLabel}</span>
            <div className="lang__toggle" role="group" aria-label={content.langLabel}>
              <button
                onClick={() => setLang("en")}
                className={`lang__button ${!isAr ? "is-active" : ""}`}
                type="button"
              >
                {content.en}
              </button>
              <button
                onClick={() => setLang("ar")}
                className={`lang__button ${isAr ? "is-active" : ""}`}
                type="button"
              >
                {content.ar}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* HOME */}
        <section id="home" className="hero">
          <div>
            <p className="eyebrow">Jordan-based medical supplies</p>
            <h2 className="hero__title">{content.heroTitle}</h2>
            <p className="hero__body">{content.heroBody}</p>

            <div className="hero__actions">
              <a className="button button--primary" href={`mailto:${content.infoEmail}`}>
                {content.heroPrimary}
              </a>
              <a className="button button--ghost" href="tel:+962791752686">
                {content.heroSecondary}
              </a>
            </div>
          </div>

          <div className="hero__panel">
            <div className="panel__header">
              <span className="panel__title">{content.highlightsTitle}</span>
            </div>
            <ul className="panel__list">
              {content.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className="grid">
          {/* APPROACH */}
          <section id="approach" className="card">
            <div className="card__label">{content.marketTitle}</div>
            <p className="card__value card__value--top">{content.marketBody}</p>

            <div style={{ height: 10 }} />

            <div className="card__label">{content.sourcingTitle}</div>
            <p className="card__value card__value--top">{content.sourcingBody}</p>

            <div style={{ height: 10 }} />

            <div className="card__label">{content.qvTitle}</div>
            <p className="card__value card__value--top">{content.qvBody}</p>
          </section>

          {/* WHO WE SERVE (NEW) */}
          <section id="serve" className="card">
            <div className="card__label">{content.serveTitle}</div>
            <p className="card__value card__value--top">{content.serveBody}</p>
            <ul className="list">
              {content.serveList.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          {/* HOW TO ORDER */}
          <section className="card">
            <div className="card__label">{content.orderTitle}</div>
            <ul className="list">
              {content.orderSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          {/* PRODUCTS */}
          <section id="products" className="card">
            <div className="card__label">{content.productsTitle}</div>
            <p className="card__value card__value--top" style={{ fontWeight: 800 }}>
              {content.productsSubtitle}
            </p>
            <ul className="list">
              {content.products.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div style={{ height: 10 }} />

            <p className="card__value card__value--top" style={{ fontWeight: 800 }}>
              {content.additionalTitle}
            </p>
            <ul className="list">
              {content.additional.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <p className="note" style={{ marginTop: 10 }}>
              {content.productsNote}
            </p>
          </section>

          {/* LOCATION */}
          <section className="card">
            <div className="card__label">{content.locationLabel}</div>

            <p className="card__value" style={{ fontWeight: 900 }}>
              {content.locationDetails}
            </p>
            <p className="card__value card__value--top">
              <strong>{content.serviceAreaLabel}: </strong>
              {content.serviceAreaValue}
            </p>


            <p className="card__value card__value--top">
              <strong>{content.zipLabel}: </strong>
              {content.zipValue}
            </p>

            <p className="card__value card__value--top">
              <strong>{content.coordsLabel}: </strong>
              {content.coordsValue}
            </p>

            <div style={{ height: 12 }} />

            <div className="map">
              <iframe
                title="Zomorod location map"
                src="https://www.google.com/maps?q=31.985555,35.897777&z=15&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <p className="card__value card__value--top">
              <a
                className="link"
                href="https://www.google.com/maps?q=31.985555,35.897777"
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.mapOpenLabel}
              </a>
            </p>
          </section>

          {/* CONTACT */}
          <section id="contact" className="card">
            <div className="card__label">{content.contactTitle}</div>

            <div className="stack">
              <div className="card__label">{content.phonesLabel}</div>
              <p className="card__value card__value--spaced">
                <strong>{content.companyPhoneLabel}: </strong>
                <a href="tel:+962791752686" className="link">
                  +962 79 175 2686
                </a>
              </p>
              <p className="card__value">
                <strong>{content.doctorPhoneLabel}: </strong>
                <a href="tel:+962790554065" className="link">
                  +962 79 055 4065
                </a>
              </p>
            </div>

            <div className="stack">
              <div className="card__label">{content.emailsLabel}</div>
              <p className="card__value">
                <a href={`mailto:${content.infoEmail}`} className="link">
                  {content.infoEmail}
                </a>
              </p>
            </div>

            <div style={{ height: 10 }} />

            <div className="card__label">{content.ctaTitle}</div>
            <p className="card__value card__value--top">{content.ctaBody}</p>

            <div style={{ height: 10 }} />

            <div className="card__label">{content.noteTitle}</div>
            <p className="card__value card__value--top">{content.noteBody}</p>
          </section>

          {/* LEADERSHIP */}
          <section id="leadership" className="card">
            <div className="card__label">{content.aboutTitle}</div>

            <p className="card__value card__value--top" style={{ fontWeight: 900 }}>
              {content.mdTitle}
            </p>
            <p className="card__value card__value--top">{content.mdBio}</p>
            <p className="card__value card__value--top">
              <strong>{content.mdEmailLabel}: </strong>
              <a href={`mailto:${content.mdEmail}`} className="link">
                {content.mdEmail}
              </a>
            </p>

            <div style={{ height: 12 }} />

            <p className="card__value card__value--top" style={{ fontWeight: 900 }}>
              {content.osamaTitle}
            </p>
            <p className="card__value card__value--top">{content.osamaBio}</p>
            <p className="card__value card__value--top">
              <strong>{content.osamaEmailLabel}: </strong>
              <a href={`mailto:${content.osamaEmail}`} className="link">
                {content.osamaEmail}
              </a>
            </p>
          </section>

          {/* COMPLIANCE */}
          <section id="compliance" className="card">
            <div className="card__label">{content.complianceTitle}</div>
            <p className="card__value card__value--top">{content.complianceBody}</p>
          </section>
        </div>

        <p className="note">{content.contactNote}</p>

        <div className="social">
          <a
            href="https://www.linkedin.com/company/zomorod-medical-supplies"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Zomorod Medical Supplies on LinkedIn"
            className="social__icon"
          >
            in
          </a>
        </div>

        <footer className="footer">{content.footer}</footer>
      </main>

      <a
        href="https://wa.me/962791752686"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp"
      >
        WhatsApp
      </a>
    </div>
  );
}





