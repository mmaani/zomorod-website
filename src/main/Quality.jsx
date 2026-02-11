import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const QUALITY_COPY = {
  en: {
    title: "Quality & Compliance",
    intro:
      "Our approach focuses on practical quality control, traceability, and clear communication with professional buyers.",
    sections: [
      {
        h: "Operating principles",
        items: [
          "Consistent product specifications and pack units across repeat orders.",
          "Clear communication on availability, lead time, and options.",
          "Structured handling of feedback and quality observations.",
        ],
      },
      {
        h: "Documentation support",
        items: [
          "We share available product and supplier documentation when required.",
          "Documentation differs by product category and destination market.",
          "Buyers are advised on practical next steps before order finalization.",
        ],
      },
      {
        h: "Traceability and issue handling",
        items: [
          "Lot/batch and expiry information are tracked when available upstream.",
          "Reported issues are logged and reviewed with relevant supply partners.",
          "Corrective actions are coordinated based on risk and case specifics.",
        ],
      },
      {
        h: "Storage and distribution discipline",
        items: [
          "Products are handled according to storage needs communicated by suppliers.",
          "Distribution planning prioritizes product integrity and delivery reliability.",
          "Records are maintained to support continuity and audit readiness.",
        ],
      },
    ],
  },
  ar: {
    title: "الجودة والامتثال",
    intro:
      "يركز نهجنا على ضبط الجودة العملي، وقابلية التتبع، ووضوح التواصل مع المشترين المهنيين.",
    sections: [
      {
        h: "مبادئ التشغيل",
        items: [
          "ثبات المواصفات ووحدات التعبئة عبر الطلبات المتكررة.",
          "وضوح التواصل بشأن التوفر والمدة والخيارات.",
          "متابعة الملاحظات التشغيلية وملاحظات الجودة بشكل منظم.",
        ],
      },
      {
        h: "دعم المستندات",
        items: [
          "نشارك المستندات المتاحة للمنتجات والموردين عند الحاجة.",
          "تختلف المستندات حسب الفئة والوجهة.",
          "نقدم إرشاداً عملياً قبل اعتماد الطلب بشكل نهائي.",
        ],
      },
      {
        h: "التتبع ومعالجة الملاحظات",
        items: [
          "يتم تتبع معلومات التشغيلة/الدفعة والانتهاء عند توفرها من المصدر.",
          "يتم تسجيل الملاحظات ومراجعتها مع الشركاء المعنيين.",
          "يتم تنسيق الإجراءات التصحيحية حسب مستوى المخاطر وحالة كل ملف.",
        ],
      },
      {
        h: "الانضباط في التخزين والتوزيع",
        items: [
          "يتم التعامل مع المنتجات حسب متطلبات التخزين الواردة من المورد.",
          "يُبنى التخطيط اللوجستي على الحفاظ على سلامة المنتج وموثوقية التسليم.",
          "يتم حفظ السجلات بما يدعم الاستمرارية والجاهزية للمراجعة.",
        ],
      },
    ],
  },
};

export default function Quality() {
  const { lang } = useOutletContext();
  const copy = useMemo(() => QUALITY_COPY[lang] || QUALITY_COPY.en, [lang]);

  return (
    <main className="page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <section className="card page-section legal-shell">
        <div className="page-head legal-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {copy.title}
          </h1>
          <p className="p" style={{ margin: 0 }}>
            {copy.intro}
          </p>
        </div>

        <div className="legal-grid">
          {copy.sections.map((s) => (
            <article key={s.h} className="card-soft legal-card">
              <h2 className="legal-card-title">{s.h}</h2>
              <ul className="legal-list">
                {s.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
