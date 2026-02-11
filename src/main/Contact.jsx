import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const COMPANY_LINKEDIN =
  "https://www.linkedin.com/company/zomorod-medical-supplies";
const MD_LINKEDIN = "https://www.linkedin.com/in/mohammadamaani/";

function LinkedInIcon({ title = "LinkedIn" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 8.5H4.5V24H.5V8.5ZM8.5 8.5H12.3V10.6H12.36C12.89 9.6 14.2 8.5 16.2 8.5 20.3 8.5 21 11.1 21 14.5V24H17V15.6C17 13.6 17 11.9 15.2 11.9 13.4 11.9 13.1 13.3 13.1 15.5V24H9.1V8.5H8.5Z"
      />
    </svg>
  );
}

export default function Contact() {
  const { lang, t, whatsappQuoteHref } = useOutletContext();

  const copy = useMemo(() => {
    const isAr = lang === "ar";
    return isAr
      ? {
          title: "التواصل",
          subtitle:
            "يمكنكم التواصل معنا مباشرة عبر البريد أو الهاتف أو واتساب. سنرد خلال يومي عمل عادةً.",
          labels: {
            email: "البريد الإلكتروني",
            phone: "الهاتف",
            whatsapp: "واتساب",
            address: "العنوان",
            linkedin: "لينكدإن",
            businessHours: "ساعات العمل",
          },
          address: "Sport City Circle, Amman, Jordan",
          hours: "الأحد–الخميس | 9:00 ص – 5:00 م",
          companyLinkedIn: "صفحة الشركة",
          mdLinkedIn: "المدير العام",
          noteTitle: "قبل إرسال الطلب",
          note:
            "لتحصل على رد أسرع، أرسل الفئة + المواصفات + وحدة التعبئة + الكمية + مدينة التسليم.",
        }
      : {
          title: "Contact",
          subtitle:
            "You can reach us directly by email, phone, or WhatsApp. Typical response time is within two business days.",
          labels: {
            email: "Email",
            phone: "Phone",
            whatsapp: "WhatsApp",
            address: "Address",
            linkedin: "LinkedIn",
            businessHours: "Business hours",
          },
          address: "Sport City Circle, Amman, Jordan",
          hours: "Sunday–Thursday | 9:00 AM – 5:00 PM",
          companyLinkedIn: "Company page",
          mdLinkedIn: "Managing Director",
          noteTitle: "Before you send a request",
          note:
            "For faster handling, include category + specification + pack unit + quantity + destination city.",
        };
  }, [lang]);

  return (
    <main className="page" dir={t?.dir || (lang === "ar" ? "rtl" : "ltr")}>
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {copy.title}
          </h1>
          <p className="p" style={{ margin: 0 }}>
            {copy.subtitle}
          </p>
        </div>

        <div className="hr" />

        <div className="contact-grid">
          <div className="card-soft">
            <div className="contact-item">
              <div className="contact-label">{copy.labels.email}</div>
              <div className="contact-value">
                <a className="ltr" href="mailto:info@zomorodmedical.com">
                  <bdi>info@zomorodmedical.com</bdi>
                </a>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-label">{copy.labels.phone}</div>
              <div className="contact-value">
                <a className="ltr" href="tel:+962791752686">
                  <bdi>+962 79 175 2686</bdi>
                </a>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-label">{copy.labels.whatsapp}</div>
              <div className="contact-value">
                <a
                  className="ltr"
                  href={whatsappQuoteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <bdi>wa.me/962791752686</bdi>
                </a>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-label">{copy.labels.address}</div>
              <div className="contact-value ltr">
                <bdi>{copy.address}</bdi>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-label">{copy.labels.businessHours}</div>
              <div className="contact-value">{copy.hours}</div>
            </div>
          </div>

          <div className="card-soft">
            <div className="contact-label" style={{ marginBottom: 10 }}>
              {copy.labels.linkedin}
            </div>

            <div className="contact-links-stack">
              <a
                className="contact-link-chip ltr"
                href={COMPANY_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-link-icon" aria-hidden="true">
                  <LinkedInIcon title="LinkedIn" />
                </span>
                <bdi>{copy.companyLinkedIn}</bdi>
              </a>

              <a
                className="contact-link-chip ltr"
                href={MD_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-link-icon" aria-hidden="true">
                  <LinkedInIcon title="LinkedIn" />
                </span>
                <bdi>{copy.mdLinkedIn}</bdi>
              </a>
            </div>

            <div className="hr" />

            <div className="contact-label" style={{ marginBottom: 8 }}>
              {copy.noteTitle}
            </div>
            <p className="p" style={{ margin: 0 }}>
              {copy.note}
            </p>
          </div>

          <div className="card-soft contact-map-card">
            <div className="contact-label" style={{ marginBottom: 10 }}>
              {lang === "ar" ? "الموقع على الخريطة" : "Location on map"}
            </div>
            <div className="contact-map-frame-wrap">
              <iframe
                title={lang === "ar" ? "موقع الشركة" : "Company location"}
                src="https://www.google.com/maps?q=Sport+City+Circle,+Amman,+Jordan&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="contact-map-frame"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
