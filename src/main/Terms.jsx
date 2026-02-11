import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const TERMS_COPY = {
  en: {
    title: "Terms of Use",
    updated: "Updated",
    date: "2026-02-11",
    intro:
      "These terms govern the use of the Zomorod website. By using the site, you agree to these terms.",
    sections: [
      {
        h: "Website purpose",
        body: "This website provides general company, product-category, and contact information. Product availability and commercial terms are confirmed only through direct communication.",
      },
      {
        h: "Accuracy of information",
        body: "We aim to keep content accurate and up to date, but we do not guarantee that all details are complete at all times.",
      },
      {
        h: "Intellectual property",
        body: "All website content (text, design, logos, and media) is owned by Zomorod or used with permission and may not be copied or reused without authorization.",
      },
      {
        h: "External links",
        body: "The site may include links to third-party services. We are not responsible for the content or policies of those external websites.",
      },
      {
        h: "Limitation of liability",
        body: "Zomorod is not liable for indirect losses resulting from website use, interruptions, or technical issues.",
      },
      {
        h: "Updates to terms",
        body: "We may revise these terms when needed. The latest version on this page is the applicable version.",
      },
    ],
  },
  ar: {
    title: "شروط الاستخدام",
    updated: "آخر تحديث",
    date: "2026-02-11",
    intro:
      "تحكم هذه الشروط استخدام موقع زمرد. باستخدامك للموقع فأنت توافق على هذه الشروط.",
    sections: [
      {
        h: "غرض الموقع",
        body: "يوفر هذا الموقع معلومات عامة عن الشركة وفئات المنتجات ووسائل التواصل. تأكيد التوفر والشروط التجارية يتم عبر التواصل المباشر فقط.",
      },
      {
        h: "دقة المعلومات",
        body: "نسعى لتحديث المحتوى باستمرار، لكن لا نضمن اكتمال جميع التفاصيل في كل وقت.",
      },
      {
        h: "الملكية الفكرية",
        body: "جميع محتويات الموقع (النصوص، التصميم، الشعارات، والوسائط) مملوكة لزمرد أو مستخدمة بتصريح ولا يجوز نسخها أو إعادة استخدامها دون إذن.",
      },
      {
        h: "الروابط الخارجية",
        body: "قد يحتوي الموقع على روابط لجهات خارجية. لسنا مسؤولين عن محتوى أو سياسات تلك المواقع.",
      },
      {
        h: "حدود المسؤولية",
        body: "لا تتحمل زمرد أي خسائر غير مباشرة ناتجة عن استخدام الموقع أو انقطاعه أو أي مشكلات تقنية.",
      },
      {
        h: "تحديث الشروط",
        body: "قد نقوم بتعديل هذه الشروط عند الحاجة. وتعد النسخة المنشورة في هذه الصفحة هي المعتمدة.",
      },
    ],
  },
};

export default function Terms() {
  const { lang } = useOutletContext();
  const copy = useMemo(() => TERMS_COPY[lang] || TERMS_COPY.en, [lang]);

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
              <p className="p" style={{ margin: 0 }}>
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
