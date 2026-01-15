import { useMemo, useState } from "react";
import logo from "./logo.png";
import "./styles.css";

export default function App() {
  const [lang, setLang] = useState("en");
  const isAr = lang === "ar";

  const content = useMemo(() => {
    const en = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "Medical consumer goods supply & distribution — based in Amman, Jordan.",

      heroTitle: "Reliable supply of essential medical consumer goods.",
      heroBody:
        "We focus on everyday medical consumer products and respond quickly to requested quantities and delivery locations.",
      heroPrimary: "Email us",
      heroSecondary: "Call us",

      highlightsTitle: "Why Zomorod",
      highlights: [
        "Clear availability and lead-time communication",
        "Quality-focused sourcing and careful handling",
        "Fast response via phone, email, and WhatsApp",
      ],

      aboutTitle: "Leadership",
      mdTitle: "Managing Director — Mohammad Maani (MBA)",
      mdBio:
        "MBA-qualified Managing Director with 12+ years of experience across the private sector and international NGOs (INGOs). Experienced in the medical field and in leading operations and partnerships across the MENA region and West Africa.",

      osamaTitle: "Dr. Osama Waleed Alakhras — Technical Expert",
      osamaBio:
        "PharmaD with 15+ years of professional experience as a medical representative. Worked with well-known pharmaceutical companies across psychiatric medications, antibiotics, dietary supplements, and medical cosmetic products (body, hair, and dental care).",

      locationLabel: "Location",
      locationValue: "Amman, Jordan",

      contactLabel: "Contact",
      phonesLabel: "Phone",
      emailsLabel: "Email",

      productsLabel: "Current Products (Small Scale)",
      products: [
        "Toothpaste & Toothbrushes",
        "Personal protection products (condoms)",
        "Baby feeding bottle with silicone pacifier",
      ],

      noteTitle: "Availability",
      noteBody:
        "We operate at a small scale and supply based on demand. For inquiries, please contact us by phone or email.",

      ctaTitle: "Request a Quote",
      ctaBody:
        "Send your quantity and delivery location to info@zomorodmedical.com and we will respond promptly.",

      contactNote: "Prefer WhatsApp? Tap the button to message us instantly.",
      footer: `© ${new Date().getFullYear()} Zomorod Medical Supplies LLC. All rights reserved.`,

      langLabel: "Language",
      en: "EN",
      ar: "AR",

      companyPhoneLabel: "Company",
      doctorPhoneLabel: "Dr. Osama",
    };

    const ar = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "توريد وتوزيع المنتجات الطبية الاستهلاكية — مقرّنا عمّان، الأردن.",

      heroTitle: "توريد موثوق للمنتجات الطبية الاستهلاكية الأساسية.",
      heroBody:
        "نركّز على المنتجات الطبية الاستهلاكية اليومية ونستجيب بسرعة للكميات المطلوبة ومواقع التسليم.",
      heroPrimary: "راسلنا بالبريد",
      heroSecondary: "اتصل بنا",

      highlightsTitle: "لماذا زمرد؟",
      highlights: [
        "وضوح في التوفر ووقت التوريد",
        "اهتمام بالجودة وحسن التعامل مع المنتجات",
        "استجابة سريعة عبر الهاتف والبريد وواتساب",
      ],

      aboutTitle: "الإدارة",
      mdTitle: "المدير العام — محمد المعاني (MBA)",
      mdBio:
        "مدير عام حاصل على ماجستير إدارة أعمال (MBA) بخبرة تزيد عن 12 عامًا في القطاع الخاص والمنظمات الدولية غير الحكومية. لديه خبرة في المجال الطبي وقيادة العمليات وبناء الشراكات في منطقة الشرق الأوسط وشمال أفريقيا وغرب أفريقيا.",

      osamaTitle: "د. أسامة وليد الأخرس — الخبير الفني",
      osamaBio:
        "حاصل على بكالوريس دكتور في الصيدلة بخبرة مهنية تزيد عن 15 عامًا كمندوب طبي. عمل مع شركات دوائية معروفة في مجالات تشمل أدوية الطب النفسي، والمضادات الحيوية، والمكملات الغذائية، ومنتجات التجميل الطبية (العناية بالجسم والشعر والأسنان).",

      locationLabel: "الموقع",
      locationValue: "عمّان، الأردن",

      contactLabel: "التواصل",
      phonesLabel: "الهاتف",
      emailsLabel: "البريد الإلكتروني",

      productsLabel: "المنتجات الحالية (على نطاق صغير)",
      products: [
        "معجون الأسنان وفرش الأسنان",
        "منتجات حماية شخصية (واقيات)",
        "رضّاعة أطفال مع لهاية سيليكون",
      ],

      noteTitle: "التوفر",
      noteBody:
        "نعمل حاليًا على نطاق صغير ويتم التوريد حسب الطلب. للاستفسارات، يرجى التواصل عبر الهاتف أو البريد الإلكتروني.",

      ctaTitle: "طلب عرض سعر",
      ctaBody:
        "أرسل الكمية وموقع التسليم إلى info@zomorodmedical.com وسنقوم بالرد في أقرب وقت.",

      contactNote: "تفضّل واتساب؟ اضغط الزر لإرسال رسالة مباشرة.",
      footer: `© ${new Date().getFullYear()} Zomorod Medical Supplies LLC. جميع الحقوق محفوظة.`,

      langLabel: "اللغة",
      en: "EN",
      ar: "AR",

      companyPhoneLabel: "هاتف الشركة",
      doctorPhoneLabel: "د. أسامة",
    };

    return isAr ? ar : en;
  }, [isAr]);

  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} className="page">
      <header className="header">
        <div className="brand">
          <img src={logo} alt="Zomorod Medical Supplies LLC" className="brand__logo" />
          <div>
            <h1 className="brand__title">{content.brand}</h1>
            <p className="brand__tagline">{content.tagline}</p>
          </div>
        </div>

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
      </header>

      <main className="main">
        <section className="hero">
          <div>
            <p className="eyebrow">{content.contactLabel}</p>
            <h2 className="hero__title">{content.heroTitle}</h2>
            <p className="hero__body">{content.heroBody}</p>

            <div className="hero__actions">
              <a className="button button--primary" href="mailto:info@zomorodmedical.com">
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
          <section className="card">
            <div className="card__label">{content.locationLabel}</div>
            <p className="card__value">{content.locationValue}</p>
          </section>

          <section className="card">
            <div className="card__label">{content.contactLabel}</div>

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
              <p className="card__value card__value--spaced">
                <a href="mailto:info@zomorodmedical.com" className="link">
                  info@zomorodmedical.com
                </a>
              </p>
              <p className="card__value card__value--spaced">
                <a href="mailto:m.maani@zomorodmedical.com" className="link">
                  m.maani@zomorodmedical.com
                </a>
              </p>
              <p className="card__value">
                <a href="mailto:o.nbhan@zomorodmedical.com" className="link">
                  o.nbhan@zomorodmedical.com
                </a>
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card__label">{content.productsLabel}</div>
            <ul className="list">
              {content.products.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card__label">{content.ctaTitle}</div>
            <p className="card__value card__value--top">{content.ctaBody}</p>
          </section>

          <section className="card">
            <div className="card__label">{content.noteTitle}</div>
            <p className="card__value card__value--top">{content.noteBody}</p>
          </section>

          {/* NEW: Leadership section */}
          <section className="card">
            <div className="card__label">{content.aboutTitle}</div>

            <p className="card__value card__value--top" style={{ fontWeight: 800 }}>
              {content.mdTitle}
            </p>
            <p className="card__value card__value--top">{content.mdBio}</p>

            <div style={{ height: 10 }} />

            <p className="card__value card__value--top" style={{ fontWeight: 800 }}>
              {content.osamaTitle}
            </p>
            <p className="card__value card__value--top">{content.osamaBio}</p>
          </section>
        </div>

        <p className="note">{content.contactNote}</p>
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


