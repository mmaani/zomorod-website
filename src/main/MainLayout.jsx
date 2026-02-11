// src/main/MainLayout.jsx
import React, { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";

const WHATSAPP_NUMBER = "962791752686";

export function buildWhatsAppLink(message) {
  const text = encodeURIComponent(String(message || ""));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

const COPY = {
  en: {
    dir: "ltr",
    langLabel: "عربي",
    brandShort: "ZOMOROD",
    brandName: "Zomorod Medical Supplies LLC",
    tagline:
      "Reliable supply and consistent specifications for pharmacies and resellers — Jordan & Syria.",
    responseSla: "Quote response within 48 business hours.",

    // ✅ You asked: quality after contact
    nav: {
      home: "Company",
      products: "Products",
      careers: "Careers",
      contact: "Contact",
      quality: "Quality & Compliance",
    },

    ctaStaff: "Staff Login",
    ctaQuote: "Get a Quote",
    quoteBase:
      "Hi, I'd like a quote. Please specify category, specification, pack unit, quantity, and delivery city.",

    // ✅ LinkedIn (personal + company)
    mdLinkedInLabel: "LinkedIn",
    mdLinkedInUrl: "https://www.linkedin.com/in/mohammadamaani/",
    companyLinkedInLabel: "Company LinkedIn",
    companyLinkedInUrl: "https://www.linkedin.com/company/zomorod-medical-supplies",
  },

  ar: {
    dir: "rtl",
    langLabel: "EN",
    brandShort: "زمرد",
    brandName: "شركة زمرد للمستلزمات الطبية ذ.م.م",
    tagline: "توريد موثوق ومواصفات ثابتة للصيدليات والموزعين — الأردن وسوريا.",
    responseSla: "الرد على عروض الأسعار خلال 48 ساعة عمل.",

    nav: {
      home: "الشركة",
      products: "المنتجات",
      careers: "الوظائف",
      contact: "التواصل",
      quality: "الجودة والامتثال",
    },

    ctaStaff: "دخول الموظفين",
    ctaQuote: "احصل على عرض سعر",
    quoteBase:
      "مرحباً، أريد عرض سعر. الرجاء تحديد الفئة، المواصفات، وحدة التعبئة، الكمية، ومدينة التسليم.",

    // ✅ LinkedIn (personal + company)
    mdLinkedInLabel: "لينكدإن",
    mdLinkedInUrl: "https://www.linkedin.com/in/mohammadamaani/",
    companyLinkedInLabel: "لينكدإن الشركة",
    companyLinkedInUrl: "https://www.linkedin.com/company/zomorod-medical-supplies",
  },
};

export default function MainLayout() {
  const [lang, setLang] = useState("en");
  const t = useMemo(() => COPY[lang] || COPY.en, [lang]);

  const whatsappQuoteHref = useMemo(() => buildWhatsAppLink(t.quoteBase), [t.quoteBase]);

  return (
    <div className="site" dir={t.dir}>
      <SiteHeader
        lang={lang}
        t={t}
        whatsappQuoteHref={whatsappQuoteHref}
        onToggleLang={() => setLang((p) => (p === "en" ? "ar" : "en"))}
      />

      <div className="site-body">
        <Outlet context={{ lang, t, whatsappQuoteHref }} />
      </div>

      <SiteFooter lang={lang} />
    </div>
  );
}
