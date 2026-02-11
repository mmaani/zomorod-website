import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const PRIVACY_COPY = {
  en: {
    title: "Privacy Policy",
    updated: "Updated",
    date: "2026-02-11",
    intro:
      "This policy explains what personal data we collect through this website and how we handle it.",
    sections: [
      {
        h: "Who controls your data",
        body: "Zomorod Medical Supplies LLC, Amman, Jordan. For any privacy request, contact info@zomorodmedical.com.",
      },
      {
        h: "What we collect",
        items: [
          "Contact details you submit (name, email, phone, and message).",
          "Recruitment details if you apply for a job (CV and applicant information).",
          "Basic technical logs needed for security and website operation.",
        ],
      },
      {
        h: "How we use data",
        items: [
          "To answer business inquiries and quote requests.",
          "To process recruitment applications.",
          "To maintain service quality and protect the site from abuse.",
        ],
      },
      {
        h: "Sharing and retention",
        body: "We do not sell personal data. Limited data may be processed by trusted providers (hosting/email/storage) only when needed. Data is kept only for a reasonable operational or legal period.",
      },
      {
        h: "Your rights",
        body: "You can request access, correction, or deletion of your personal data by email.",
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث",
    date: "2026-02-11",
    intro:
      "توضح هذه السياسة البيانات الشخصية التي نجمعها عبر الموقع وكيفية التعامل معها.",
    sections: [
      {
        h: "الجهة المسؤولة عن البيانات",
        body: "شركة زمرد للمستلزمات الطبية ذ.م.م، عمّان - الأردن. لطلبات الخصوصية: info@zomorodmedical.com",
      },
      {
        h: "ما الذي نجمعه",
        items: [
          "بيانات التواصل التي ترسلها (الاسم، البريد، الهاتف، ومحتوى الرسالة).",
          "بيانات التوظيف عند التقديم على وظيفة (السيرة الذاتية وبيانات المتقدم).",
          "سجلات تقنية أساسية لتشغيل الموقع وحمايته.",
        ],
      },
      {
        h: "كيف نستخدم البيانات",
        items: [
          "للرد على الاستفسارات وطلبات عروض الأسعار.",
          "لمعالجة طلبات التوظيف.",
          "لتحسين الموثوقية وحماية الموقع من إساءة الاستخدام.",
        ],
      },
      {
        h: "المشاركة ومدة الاحتفاظ",
        body: "لا نقوم ببيع البيانات الشخصية. قد تتم معالجة بيانات محدودة عبر مزودين موثوقين (استضافة/بريد/تخزين) عند الحاجة فقط. يتم الاحتفاظ بالبيانات لمدة تشغيلية أو قانونية معقولة.",
      },
      {
        h: "حقوقك",
        body: "يمكنك طلب الوصول أو التصحيح أو الحذف عبر البريد الإلكتروني.",
      },
    ],
  },
};

export default function Privacy() {
  const { lang } = useOutletContext();
  const copy = useMemo(() => PRIVACY_COPY[lang] || PRIVACY_COPY.en, [lang]);

  return (
    <main className="page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <section className="card page-section legal-shell">
        <div className="page-head legal-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {copy.title}
          </h1>
          <div className="legal-updated">
            {copy.updated}: <bdi>{copy.date}</bdi>
          </div>
          <p className="p" style={{ margin: 0 }}>
            {copy.intro}
          </p>
        </div>

        <div className="legal-grid">
          {copy.sections.map((s) => (
            <article key={s.h} className="card-soft legal-card">
              <h2 className="legal-card-title">{s.h}</h2>
              {Array.isArray(s.items) ? (
                <ul className="legal-list">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : (
                <p className="p" style={{ margin: 0 }}>
                  {s.body}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
