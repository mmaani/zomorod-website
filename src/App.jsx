import { useMemo, useState } from "react";
import logo from "./logo.png";

export default function App() {
  const [lang, setLang] = useState("en"); // "en" | "ar"
  const isAr = lang === "ar";

  const content = useMemo(() => {
    const en = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "Medical consumer goods supply & distribution — based in Amman, Jordan.",
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
      langLabel: "Language",
      en: "EN",
      ar: "AR",
    };

    const ar = {
      brand: "Zomorod Medical Supplies LLC",
      tagline: "توريد وتوزيع المنتجات الطبية الاستهلاكية — مقرّنا عمّان، الأردن.",
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
      langLabel: "اللغة",
      en: "EN",
      ar: "AR",
    };

    return isAr ? ar : en;
  }, [isAr]);

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  };

  const labelStyle = { fontSize: 12, opacity: 0.7, marginBottom: 6 };
  const valueStyle = { fontSize: 14, margin: 0 };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      lang={isAr ? "ar" : "en"}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f7f7fb 0%, #ffffff 40%)",
        color: "#111",
      }}
    >
      <header
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "28px 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
  <img
    src={logo}
    alt="Zomorod Medical Supplies LLC"
    style={{ height: 48, width: "auto" }}
  />
  <div>
    <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 0.2 }}>
      {content.brand}
    </h1>
    <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
      {content.tagline}
    </p>
  </div>
</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{content.langLabel}</span>
          <div
            style={{
              display: "inline-flex",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setLang("en")}
              style={{
                padding: "8px 12px",
                border: "none",
                background: !isAr ? "#111" : "transparent",
                color: !isAr ? "#fff" : "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
              aria-label="Switch to English"
            >
              {content.en}
            </button>
            <button
              onClick={() => setLang("ar")}
              style={{
                padding: "8px 12px",
                border: "none",
                background: isAr ? "#111" : "transparent",
                color: isAr ? "#fff" : "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
              aria-label="Switch to Arabic"
            >
              {content.ar}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "12px 18px 36px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {/* Location */}
          <section style={cardStyle}>
            <div style={labelStyle}>{content.locationLabel}</div>
            <p style={valueStyle}>{content.locationValue}</p>
          </section>

          {/* Contact */}
          <section style={cardStyle}>
            <div style={labelStyle}>{content.contactLabel}</div>

            <div style={{ marginTop: 10 }}>
              <div style={labelStyle}>{content.phonesLabel}</div>
              <p style={{ ...valueStyle, marginBottom: 6 }}>
                <strong>{isAr ? "هاتف الشركة: " : "Company: "}</strong>
                <a href="tel:+962791752686" style={{ textDecoration: "none" }}>
                  +962 79 175 2686
                </a>
              </p>
              <p style={{ ...valueStyle, margin: 0 }}>
                <strong>{isAr ? "د. أسامة: " : "Dr. Osama: "}</strong>
                <a href="tel:+962790554065" style={{ textDecoration: "none" }}>
                  +962 79 055 4065
                </a>
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>{content.emailsLabel}</div>
              <p style={{ ...valueStyle, marginBottom: 6 }}>
                <a href="mailto:info@zomorodmedical.com" style={{ textDecoration: "none" }}>
                  info@zomorodmedical.com
                </a>
              </p>
              <p style={{ ...valueStyle, marginBottom: 6 }}>
                <a href="mailto:m.maani@zomorodmedical.com" style={{ textDecoration: "none" }}>
                  m.maani@zomorodmedical.com
                </a>
              </p>
              <p style={{ ...valueStyle, margin: 0 }}>
                <a href="mailto:o.nbhan@zomorodmedical.com" style={{ textDecoration: "none" }}>
                  o.nbhan@zomorodmedical.com
                </a>
              </p>
            </div>
          </section>

          {/* Products */}
          <section style={cardStyle}>
            <div style={labelStyle}>{content.productsLabel}</div>
            <ul style={{ margin: "10px 0 0", paddingInlineStart: isAr ? 18 : 18 }}>
              {content.products.map((p) => (
                <li key={p} style={{ marginBottom: 8 }}>
                  {p}
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section style={cardStyle}>
            <div style={labelStyle}>{content.ctaTitle}</div>
            <p style={{ ...valueStyle, marginTop: 10 }}>{content.ctaBody}</p>
          </section>

          {/* Note */}
          <section style={cardStyle}>
            <div style={labelStyle}>{content.noteTitle}</div>
            <p style={{ ...valueStyle, marginTop: 10 }}>{content.noteBody}</p>
          </section>
        </div>
<a
  href="https://wa.me/962791752686"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    position: "fixed",
    bottom: 18,
    right: 18,
    background: "#25D366",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 600,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    zIndex: 1000,
  }}
>
  WhatsApp
</a>

        <footer style={{ marginTop: 22, opacity: 0.7, fontSize: 12 }}>
          {content.footer}
        </footer>
      </main>
    </div>
  );
}

