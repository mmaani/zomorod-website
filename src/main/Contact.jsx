// src/main/Contact.jsx
import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const COMPANY_LINKEDIN = "https://www.linkedin.com/company/zomorod-medical-supplies";
const MD_LINKEDIN = "https://www.linkedin.com/in/mohammadamaani/";

export default function Contact() {
  const { lang, t, whatsappQuoteHref } = useOutletContext();

  const copy = useMemo(() => {
    const isAr = lang === "ar";
    return isAr
      ? {
          title: "التواصل",
          subtitle:
            "للطلبات وعروض الأسعار: أسرع طريقة هي إرسال التفاصيل عبر واتساب (الفئة، المواصفات، وحدة التعبئة، الكمية، ومدينة/وجهة التسليم).",
          cards: {
            email: "البريد الإلكتروني",
            phone: "الهاتف",
            address: "العنوان",
            whatsapp: "واتساب",
            linkedin: "لينكدإن",
          },
          address: "Sport City Circle, Amman, Jordan",
          noteTitle: "ملاحظة (الامتثال)",
          note:
            "قد تختلف متطلبات التصنيف والاستيراد والمستندات حسب الوجهة ونوع المنتج. نوفر المستندات المتاحة وإرشادات عملية عند الطلب؛ وتبقى مسؤولية الامتثال النهائية على المستورد ومتطلبات الجهات المختصة.",
          ctas: {
            quote: "احصل على عرض سعر",
            staff: "دخول الموظفين",
            companyLinkedIn: "صفحة الشركة على لينكدإن",
            mdLinkedIn: "لينكدإن المدير العام",
          },
        }
      : {
          title: "Contact",
          subtitle:
            "For quotes and orders, the fastest way is WhatsApp with: category, specification, pack unit, quantity, and delivery city/destination.",
          cards: {
            email: "Email",
            phone: "Phone",
            address: "Address",
            whatsapp: "WhatsApp",
            linkedin: "LinkedIn",
          },
          address: "Sport City Circle, Amman, Jordan",
          noteTitle: "Compliance note",
          note:
            "Product classification and import documentation requirements vary by destination and product type. We can share available documentation and practical guidance upon request; final compliance responsibility remains with the importer and applicable authorities.",
          ctas: {
            quote: "Get a Quote",
            staff: "Staff Login",
            companyLinkedIn: "Company LinkedIn",
            mdLinkedIn: "Managing Director LinkedIn",
          },
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

          <div className="row" style={{ marginTop: 12 }}>
            <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
              {copy.ctas.quote}
            </a>
            <a className="btn btn-ghost" href="/crm/login">
              {copy.ctas.staff}
            </a>
          </div>
        </div>

        <div className="hr" />

        <div className="grid grid-2">
          <div className="card" style={{ background: "rgba(255,255,255,.04)" }}>
            <div className="card-pad">
              <div className="mkt-contact">
                <div className="mkt-contact-row">
                  <div className="mkt-contact-label">{copy.cards.email}</div>
                  <div>
                    <a className="ltr" href="mailto:info@zomorodmedical.com">
                      <bdi>info@zomorodmedical.com</bdi>
                    </a>
                  </div>
                </div>

                <div className="mkt-contact-row">
                  <div className="mkt-contact-label">{copy.cards.phone}</div>
                  <div>
                    <a className="ltr" href="tel:+962791752686">
                      <bdi>+962 79 175 2686</bdi>
                    </a>
                  </div>
                </div>

                <div className="mkt-contact-row">
                  <div className="mkt-contact-label">{copy.cards.address}</div>
                  <div className="ltr">
                    <bdi>{copy.address}</bdi>
                  </div>
                </div>

                <div className="mkt-contact-row">
                  <div className="mkt-contact-label">{copy.cards.whatsapp}</div>
                  <div>
                    <a className="ltr" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                      <bdi>wa.me/962791752686</bdi>
                    </a>
                  </div>
                </div>

                <div className="mkt-contact-row">
                  <div className="mkt-contact-label">{copy.cards.linkedin}</div>
                  <div className="row" style={{ gap: 10 }}>
                    <a className="ltr" href={COMPANY_LINKEDIN} target="_blank" rel="noopener noreferrer">
                      <bdi>{copy.ctas.companyLinkedIn}</bdi>
                    </a>
                    <span className="muted">•</span>
                    <a className="ltr" href={MD_LINKEDIN} target="_blank" rel="noopener noreferrer">
                      <bdi>{copy.ctas.mdLinkedIn}</bdi>
                    </a>
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginTop: 14 }}>
                <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
                  {copy.ctas.quote}
                </a>
                <a className="btn btn-ghost" href={COMPANY_LINKEDIN} target="_blank" rel="noopener noreferrer">
                  {copy.ctas.companyLinkedIn}
                </a>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: "rgba(255,255,255,.04)" }}>
            <div className="card-pad">
              <div className="h2" style={{ fontSize: 16, margin: "0 0 8px 0" }}>
                {copy.noteTitle}
              </div>
              <p className="p" style={{ margin: 0 }}>
                {copy.note}
              </p>

              <div className="hr" />

              <div className="grid" style={{ gap: 10 }}>
                <div className="badge badge-strong">
                  {lang === "ar" ? "نصيحة للعرض السريع" : "Tip for fastest quote"}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {lang === "ar"
                    ? "أرسل: الفئة + المواصفات + وحدة التعبئة + الكمية + مدينة/وجهة التسليم."
                    : "Send: category + specification + pack unit + quantity + delivery city/destination."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
