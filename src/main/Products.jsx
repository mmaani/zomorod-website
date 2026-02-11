// src/main/Products.jsx
import React, { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { buildWhatsAppLink } from "./MainLayout.jsx";

const UI_COPY = {
  en: {
    title: "Products",
    subtitle:
      "Category-level view — request a quotation for exact SKUs, packaging, and documentation availability.",
    filters: [
      { key: "all", label: "All" },
      { key: "wound", label: "Wound care" },
      { key: "ppe", label: "PPE" },
      { key: "baby", label: "Baby care" },
    ],
    ctaQuote: "Get a Quote",
    ctaQuality: "Quality & Compliance",
    note:
      "Tip: For faster quoting, include pack unit (piece/box/carton), specification, quantity, and destination city.",
  },
  ar: {
    title: "المنتجات",
    subtitle:
      "عرض حسب الفئات — اطلب عرض سعر لتحديد الأصناف الدقيقة، وحدة التعبئة، وتوفر المستندات.",
    filters: [
      { key: "all", label: "الكل" },
      { key: "wound", label: "العناية بالجروح" },
      { key: "ppe", label: "معدات الوقاية" },
      { key: "baby", label: "عناية بالأطفال" },
    ],
    ctaQuote: "احصل على عرض سعر",
    ctaQuality: "الجودة والامتثال",
    note:
      "نصيحة: لتسعير أسرع، اذكر وحدة التعبئة (قطعة/علبة/كرتون) والمواصفات والكمية ومدينة/وجهة التسليم.",
  },
};

const PRODUCT_ITEMS = {
  en: [
    {
      id: "adv-wound",
      category: "wound",
      title: "Advanced wound care dressings",
      body:
        "Silicone foam, hydrocolloid, and transparent film dressings (sterile options).",
      imgPng: "/products/advanced-wound-care.png",
      imgPng2x: "/products/advanced-wound-care@2x.png",
      imgSvg: "/products/advanced-wound-care.svg",
      tags: ["Sterile options", "Clinic use", "High margin"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "Basic wound care consumables",
      body:
        "Gauze swabs & rolls, non-woven pads, and elastic/crepe bandages for routine care.",
      imgPng: "/products/basic-wound-care.png",
      imgPng2x: "/products/basic-wound-care@2x.png",
      imgSvg: "/products/basic-wound-care.svg",
      tags: ["Fast-moving", "Bundling-friendly", "Reliable specs"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "Nitrile examination gloves",
      body:
        "Powder-free nitrile exam gloves (sizes S/M) with consistent QC and clear labeling.",
      imgPng: "/products/nitrile-gloves.png",
      imgPng2x: "/products/nitrile-gloves@2x.png",
      imgSvg: "/products/nitrile-gloves.svg",
      tags: ["Powder-free", "S/M sizes", "Color options"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "Type IIR surgical masks (optional add-on)",
      body:
        "Type IIR masks with ear-loop or head-loop options, suitable for private-sector channels.",
      imgPng: "/products/surgical-masks.png",
      imgPng2x: "/products/surgical-masks@2x.png",
      imgSvg: "/products/surgical-masks.svg",
      tags: ["Type IIR", "Ear/Head loop", "Private sector"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "Silicone baby feeding bottles",
      body:
        "Food-grade silicone bottles (150/240/330 ml), heat-resistant and sterilization-safe.",
      imgPng: "/products/silicone-baby-bottle.png",
      imgPng2x: "/products/silicone-baby-bottle@2x.png",
      imgSvg: "/products/silicone-baby-bottle.svg",
      tags: ["Food-grade", "BPA-free", "Heat-resistant"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "Silicone pacifiers (phase 2)",
      body:
        "Orthodontic and standard shapes (0–6m / 6–18m), individually packaged.",
      imgPng: "/products/silicone-pacifier.png",
      imgPng2x: "/products/silicone-pacifier@2x.png",
      imgSvg: "/products/silicone-pacifier.svg",
      tags: ["Orthodontic", "2 age ranges", "Individually packed"],
    },
  ],
  ar: [
    {
      id: "adv-wound",
      category: "wound",
      title: "ضمادات عناية متقدمة بالجروح",
      body:
        "ضمادات رغوية سيليكون، هيدروكولويد، وضمادات فيلم شفافة (خيارات معقمة).",
      imgPng: "/products/advanced-wound-care.png",
      imgPng2x: "/products/advanced-wound-care@2x.png",
      imgSvg: "/products/advanced-wound-care.svg",
      tags: ["خيارات معقمة", "استخدام عيادات", "هامش مرتفع"],
    },
    {
      id: "basic-wound",
      category: "wound",
      title: "مستلزمات العناية الأساسية بالجروح",
      body:
        "شاش ولفائف شاش، فوط/وسائد غير منسوجة، ورباط/ضماد مرن للعناية الروتينية.",
      imgPng: "/products/basic-wound-care.png",
      imgPng2x: "/products/basic-wound-care@2x.png",
      imgSvg: "/products/basic-wound-care.svg",
      tags: ["سريع الدوران", "مناسب للتجميع", "مواصفات ثابتة"],
    },
    {
      id: "nitrile-gloves",
      category: "ppe",
      title: "قفازات فحص نيتريل",
      body:
        "قفازات نيتريل للفحص بدون بودرة (مقاسات S/M) مع ضبط جودة وتوسيم واضح.",
      imgPng: "/products/nitrile-gloves.png",
      imgPng2x: "/products/nitrile-gloves@2x.png",
      imgSvg: "/products/nitrile-gloves.svg",
      tags: ["بدون بودرة", "مقاسات S/M", "خيارات ألوان"],
    },
    {
      id: "surgical-masks",
      category: "ppe",
      title: "كمامات جراحية Type IIR (اختياري)",
      body:
        "كمامات Type IIR بخيارات ربط خلف الأذن أو خلف الرأس، مناسبة لقنوات القطاع الخاص.",
      imgPng: "/products/surgical-masks.png",
      imgPng2x: "/products/surgical-masks@2x.png",
      imgSvg: "/products/surgical-masks.svg",
      tags: ["Type IIR", "رباط أذن/رأس", "قنوات خاصة"],
    },
    {
      id: "silicone-bottles",
      category: "baby",
      title: "رضّاعات سيليكون",
      body:
        "رضّاعات سيليكون بدرجة غذائية (150/240/330 مل)، مقاومة للحرارة وآمنة للتعقيم.",
      imgPng: "/products/silicone-baby-bottle.png",
      imgPng2x: "/products/silicone-baby-bottle@2x.png",
      imgSvg: "/products/silicone-baby-bottle.svg",
      tags: ["درجة غذائية", "خالٍ من BPA", "مقاومة للحرارة"],
    },
    {
      id: "silicone-pacifiers",
      category: "baby",
      title: "لهايات سيليكون (مرحلة 2)",
      body:
        "أشكال تقويمية وعادية (0–6 أشهر / 6–18 شهر)، مغلفة بشكل فردي.",
      imgPng: "/products/silicone-pacifier.png",
      imgPng2x: "/products/silicone-pacifier@2x.png",
      imgSvg: "/products/silicone-pacifier.svg",
      tags: ["تقويمية", "فئتان عمريتان", "تغليف فردي"],
    },
  ],
};

export default function Products() {
  const { lang, t } = useOutletContext();
  const ui = UI_COPY[lang] || UI_COPY.en;

  const [filter, setFilter] = useState("all");

  const items = PRODUCT_ITEMS[lang] || PRODUCT_ITEMS.en;

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((x) => x.category === filter);
  }, [items, filter]);

  const quoteBase =
    lang === "ar"
      ? "مرحباً، أريد عرض سعر. الرجاء تحديد الفئة، المواصفات، وحدة التعبئة، الكمية، ومدينة التسليم."
      : "Hi, I'd like a quote. Please specify category, specification, pack unit, quantity, and delivery city.";
  const whatsappQuoteHref = useMemo(() => buildWhatsAppLink(quoteBase), [quoteBase]);

  return (
    <main className="page" dir={t?.dir || "ltr"}>
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {ui.title}
          </h1>
          <p className="p">{ui.subtitle}</p>

          <div className="row">
            <a className="btn btn-primary" href={whatsappQuoteHref} target="_blank" rel="noopener noreferrer">
              {ui.ctaQuote}
            </a>
            <Link className="btn btn-ghost" to="/quality">
              {ui.ctaQuality}
            </Link>
            <span className="spacer" />
            <span className="small muted">{ui.note}</span>
          </div>

          <div className="mkt-products-toolbar" aria-label="Product filters">
            {ui.filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`mkt-filter ${filter === f.key ? "is-active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mkt-products-grid" style={{ marginTop: 14 }}>
          {filtered.map((p) => (
            <article key={p.id} className="mkt-product-card">
              <div className="mkt-product-thumb">
                <img
                  src={p.imgPng}
                  srcSet={`${p.imgPng} 1x, ${p.imgPng2x} 2x`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (p.imgSvg) e.currentTarget.src = p.imgSvg;
                  }}
                />
              </div>

              <div className="mkt-product-title">{p.title}</div>
              <p className="mkt-product-body">{p.body}</p>

              <div className="mkt-product-tags">
                {Array.isArray(p.tags) ? p.tags.map((tag) => (
                  <span key={tag} className="mkt-tag">{tag}</span>
                )) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
