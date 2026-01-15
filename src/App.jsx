import { useMemo, useState } from "react";
import logo from "./logo.png";

export default function App() {
  const [lang, setLang] = useState("en"); // "en" | "ar"
  const isAr = lang === "ar";

  const content = useMemo(() => {
    const en = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "Medical consumer goods supply & distribution — based in Amman, Jordan.",
      heroTitle: "Reliable medical supply, delivered with care.",
      heroBody:
        "We focus on essential medical consumer goods and respond quickly to your requested quantities and delivery locations.",
      heroPrimary: "Email us",
      heroSecondary: "Call us",
      highlightsTitle: "Why Zomorod",
      highlights: [
        "Responsive, small-scale fulfillment for local demand",
        "Clear communication by phone, email, and WhatsApp",
        "Jordan-based distribution with quality-focused sourcing",
      ],
      locationLabel: "Location",
      locationValue: "Amman, Jordan",
      contactLabel: "Contact",
      phonesLabel: "Phone",
      emailsLabel: "Email",
      productsLabel: "Current Products (Small Scale)",
      products: [
        "Toothpaste & Toothbrushes",
        "Condoms (sexual protection)",
        "Baby feeding bottle with silicone pacifier",
      ],
      noteTitle: "Availability",
      noteBody:
        "We operate at a small scale and supply based on demand. For inquiries, please contact us by phone or email.",
      footer:
        "© " +
        new Date().getFullYear() +
        " Zomorod Medical Supplies LLC. All rights reserved.",
      ctaTitle: "Request a Quote",
      ctaBody:
        "Send your quantity and delivery location to info@zomorodmedical.com and we will respond promptly.",
      contactNote: "Prefer WhatsApp? Tap the green button to message us instantly.",
      langLabel: "Language",
      en: "EN",
      ar: "AR",
    };

    const ar = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "توريد وتوزيع المنتجات الطبية الاستهلاكية — مقرّنا عمّان، الأردن.",
      heroTitle: "توريد طبي موثوق بعناية واهتمام.",
      heroBody:
        "نركّز على المنتجات الطبية الاستهلاكية الأساسية ونستجيب بسرعة للكميات المطلوبة ومواقع التسليم.",
      heroPrimary: "راسلنا بالبريد",
      heroSecondary: "اتصل بنا",
      highlightsTitle: "لماذا زمرد؟",
      highlights: [
        "توريد مرن وعلى نطاق صغير لتلبية الطلب المحلي",
        "تواصل واضح عبر الهاتف والبريد الإلكتروني وواتساب",
        "توزيع محلي في الأردن مع اهتمام بالجودة",
      ],
      locationLabel: "الموقع",
      locationValue: "عمّان، الأردن",
      contactLabel: "التواصل",
      phonesLabel: "الهاتف",
      emailsLabel: "البريد الإلكتروني",
      productsLabel: "المنتجات الحالية (على نطاق صغير)",
      products: [
        "معجون الأسنان وفرش الأسنان",
        "واقيات (كوندوم)",
        "رضّاعة أطفال مع لهاية سيليكون",
      ],
      noteTitle: "التوفر",
      noteBody:
        "نعمل حاليًا على نطاق صغير ويتم التوريد حسب الطلب. للاستفسارات، يرجى التواصل عبر الهاتف أو البريد الإلكتروني.",
      footer:
        "© " +
        new Date().getFullYear() +
        " Zomorod Medical Supplies LLC. جميع الحقوق محفوظة.",
      ctaTitle: "طلب عرض سعر",
      ctaBody:
        "أرسل الكمية وموقع التسليم إلى info@zomorodmedical.com وسنقوم بالرد في أقرب وقت.",
      contactNote: "تفضّل واتساب؟ اضغط الزر الأخضر لإرسال رسالة مباشرة.",
      langLabel: "اللغة",
      en: "EN",
      ar: "AR",
    };

    return isAr ? ar : en;
  }, [isAr]);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      lang={isAr ? "ar" : "en"}
      className="page"
    >
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
              aria-label="Switch to English"
            >
              {content.en}
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`lang__button ${isAr ? "is-active" : ""}`}
              aria-label="Switch to Arabic"
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
                <strong>{isAr ? "هاتف الشركة: " : "Company: "}</strong>
                <a href="tel:+962791752686" className="link">
                  +962 79 175 2686
                </a>
              </p>
              <p className="card__value">
                <strong>{isAr ? "د. أسامة: " : "Dr. Osama: "}</strong>
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
