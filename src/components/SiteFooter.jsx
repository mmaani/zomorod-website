// src/components/SiteFooter.jsx
import React from "react";

const YEAR = new Date().getFullYear();
const WHATSAPP_NUMBER = "962791752686";

export default function SiteFooter({ lang = "en" }) {
  const isAr = lang === "ar";

  const data = isAr
    ? {
        legalNameLabel: "الاسم القانوني",
        legalName: "الزمرد للمستلزمات الطبية ذ.م.م",
        addressLabel: "العنوان",
        address: "Sport City Circle, Amman, Jordan",
        idsLabel: "بيانات الشركة",
        nationalIdLabel: "الرقم الوطني",
        nationalId: "200182261",
        regNoLabel: "رقم التسجيل",
        regNo: "60228",
        contactLabel: "التواصل",
        policiesLabel: "السياسات",
        privacy: "سياسة الخصوصية",
        terms: "شروط الاستخدام",
        whatsapp: "واتساب",
        linkedinCompany: "لينكدإن الشركة",
        disclaimerLabel: "إخلاء مسؤولية (الامتثال)",
        disclaimer:
          "قد تختلف متطلبات التصنيف والاستيراد والمستندات حسب الوجهة ونوع المنتج. نوفر المستندات المتاحة وإرشادات عملية عند الطلب؛ وتبقى مسؤولية الامتثال النهائية على المستورد والجهات المختصة.",
        rights: "جميع الحقوق محفوظة",
      }
    : {
        legalNameLabel: "Legal name",
        legalName: "Zomorod Medical Supplies LLC",
        addressLabel: "Address",
        address: "Sport City Circle, Amman, Jordan",
        idsLabel: "Company identifiers",
        nationalIdLabel: "National ID",
        nationalId: "200182261",
        regNoLabel: "Registration No.",
        regNo: "60228",
        contactLabel: "Contact",
        policiesLabel: "Policies",
        privacy: "Privacy Policy",
        terms: "Terms of Use",
        whatsapp: "WhatsApp",
        linkedinCompany: "Company LinkedIn",
        disclaimerLabel: "Compliance disclaimer",
        disclaimer:
          "Product classification and import documentation requirements vary by destination and product type. We can share available documentation and practical guidance upon request; final compliance responsibility remains with the importer and applicable authorities.",
        rights: "All rights reserved",
      };

  return (
    <footer className="site-footer" dir={isAr ? "rtl" : "ltr"}>
      <div className="site-footer-inner card">
        <div className="site-footer-grid">
          <div className="site-footer-col">
            <div className="site-footer-h">{data.legalNameLabel}</div>
            <div className="site-footer-p">{data.legalName}</div>

            <div className="site-footer-h" style={{ marginTop: 10 }}>
              {data.addressLabel}
            </div>
            <div className="site-footer-p">{data.address}</div>
          </div>

          <div className="site-footer-col">
            <div className="site-footer-h">{data.idsLabel}</div>
            <div className="site-footer-p">
              {data.nationalIdLabel}: <bdi>{data.nationalId}</bdi>
              <br />
              {data.regNoLabel}: <bdi>{data.regNo}</bdi>
            </div>
          </div>

          <div className="site-footer-col">
            <div className="site-footer-h">{data.contactLabel}</div>
            <div className="site-footer-links">
              <a className="ltr" href="mailto:info@zomorodmedical.com">
                <bdi>info@zomorodmedical.com</bdi>
              </a>
              <a className="ltr" href="tel:+962791752686">
                <bdi>+962 79 175 2686</bdi>
              </a>
              <a
                className="ltr"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <bdi>{data.whatsapp}</bdi>
              </a>
              <a
                className="ltr"
                href="https://www.linkedin.com/company/zomorod-medical-supplies"
                target="_blank"
                rel="noopener noreferrer"
              >
                <bdi>{data.linkedinCompany}</bdi>
              </a>
            </div>
          </div>

          <div className="site-footer-col">
            <div className="site-footer-h">{data.policiesLabel}</div>
            <div className="site-footer-links">
              {/* keep as <a href> so it’s crawlable if you later add SSR/prerender */}
              <a href="/privacy">{data.privacy}</a>
              <a href="/terms">{data.terms}</a>
            </div>

            <div className="site-footer-h" style={{ marginTop: 12 }}>
              {data.disclaimerLabel}
            </div>
            <div className="site-footer-small">{data.disclaimer}</div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <div className="site-footer-small">
            © {YEAR} {data.legalName}. {data.rights}.
          </div>
        </div>
      </div>
    </footer>
  );
}
