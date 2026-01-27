import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const COPY = {
  en: {
    dir: "ltr",
    langLabel: "عربي",
    brandName: "Zomorod Medical Supplies LLC",
    tagline: "Your trusted partner for high-quality medical consumables and supplies in Jordan and Syria.",
    ctaStaff: "Staff Login",
    ctaWhatsapp: "Message us on WhatsApp",
    sections: {
      who: {
        title: "Who We Are",
        p1: `Zomorod Medical Supplies is an Amman-based provider of medical consumables and supplies.
             We work with trusted manufacturers to deliver compliant, documented, and reliable products
             to clinics, hospitals, and distributors across Jordan and Syria.`,
        p2: `We focus on a compliance-first approach: clear documentation, traceable sourcing,
             and consistent quality — so healthcare providers can purchase with confidence.`,
      },
      products: {
        title: "Our Products",
        cards: [
          {
            title: "Personal Protective Equipment (PPE)",
            body: "Face masks, gloves, gowns, shoe covers and essential protection items for safe clinical practice.",
          },
          {
            title: "Medical Consumables",
            body: "Syringes, dressings, infusion and catheter-related products, sterile kits, and daily-use disposables.",
          },
          {
            title: "Devices & Accessories",
            body: "Selected devices and supporting items chosen for reliability, safety, and practical field use.",
          },
        ],
      },
      operate: {
        title: "Where We Operate",
        p1: `Headquartered in Amman, we serve hospitals, clinics, labs, and medical distributors across Jordan and Syria.
             We also support cross-border opportunities when compliant and approved.`,
        p2: `Our operations prioritize documentation, traceability, and timely delivery — with local follow-up and support.`,
      },
      why: {
        title: "Why Choose Zomorod?",
        bullets: [
          { t: "Quality assurance", b: "Sourcing from reputable manufacturers, with internal checks and controlled documentation." },
          { t: "Complete documentation", b: "CoAs/CoCs and product documentation prepared for regulatory and tender requirements." },
          { t: "Competitive pricing", b: "Smart sourcing and volume options to keep pricing fair and scalable." },
          { t: "Reliable distribution", b: "Timely delivery with a professional, traceable supply process." },
        ],
      },
      contact: {
        title: "Get in Touch",
        p1: "To request a quote or learn more, contact us anytime:",
        email: "info@zomorodmedical.com",
        phoneLabel: "+962 79 175 2686",
      },
    },
  },

  ar: {
    dir: "rtl",
    langLabel: "EN",
    brandName: "شركة زمرد للمستلزمات الطبية ذ.م.م",
    tagline: "شريكك الموثوق لتوريد المستلزمات الطبية عالية الجودة في الأردن وسوريا.",
    ctaStaff: "دخول الموظفين",
    ctaWhatsapp: "راسلنا على واتساب",
    sections: {
      who: {
        title: "من نحن",
        p1: `زمرد للمستلزمات الطبية شركة مقرّها عمّان، متخصصة في توريد المستهلكات والمستلزمات الطبية.
             نتعاون مع مُصنّعين موثوقين لتقديم منتجات مطابقة للمواصفات ومدعومة بالوثائق إلى العيادات
             والمستشفيات والموزعين في الأردن وسوريا.`,
        p2: `نعتمد نهجًا يضع الامتثال أولاً: توثيق واضح، وتتبع للمصدر، وجودة ثابتة —
             لتتمكن الجهات الصحية من الشراء بثقة.`,
      },
      products: {
        title: "منتجاتنا",
        cards: [
          {
            title: "معدات الوقاية الشخصية (PPE)",
            body: "كمامات، قفازات، أرواب طبية، أغطية أحذية، ومستلزمات الوقاية الأساسية لبيئة عمل آمنة.",
          },
          {
            title: "المستهلكات الطبية",
            body: "محاقن، ضمادات، مستلزمات التسريب والقساطر، أطقم معقمة، ومستهلكات الاستخدام اليومي.",
          },
          {
            title: "الأجهزة والملحقات",
            body: "منتجات مختارة من الأجهزة والملحقات المساندة وفق معايير الاعتمادية والسلامة وسهولة الاستخدام.",
          },
        ],
      },
      operate: {
        title: "أين نعمل",
        p1: `يقع مقرنا في عمّان، ونخدم المستشفيات والعيادات والمختبرات والموزعين في مختلف محافظات الأردن وسوريا.
             كما ندعم فرص التوسع الإقليمي عند توفر الاعتمادات والامتثال المطلوب.`,
        p2: `تركيزنا على التوثيق والتتبع وسرعة التوريد — مع متابعة محلية ودعم مهني.`,
      },
      why: {
        title: "لماذا زمرد؟",
        bullets: [
          { t: "ضمان الجودة", b: "توريد من مُصنّعين موثوقين مع فحوصات داخلية وتوثيق مضبوط." },
          { t: "وثائق مكتملة", b: "تهيئة وثائق المنتج وشهادات المطابقة لدعم المتطلبات التنظيمية والمناقصات." },
          { t: "أسعار تنافسية", b: "توريد ذكي وخيارات كميات لتسعير عادل قابل للتوسع." },
          { t: "توزيع موثوق", b: "تسليم في الوقت المناسب ضمن سلسلة توريد قابلة للتتبع وبطريقة احترافية." },
        ],
      },
      contact: {
        title: "تواصل معنا",
        p1: "لطلب عرض سعر أو معرفة المزيد، تواصل معنا عبر:",
        email: "info@zomorodmedical.com",
        phoneLabel: "+962 79 175 2686",
      },
    },
  },
};

export default function MarketingPage() {
  const [lang, setLang] = useState("en");
  const t = useMemo(() => COPY[lang], [lang]);

  return (
    <main className="mkt-page" dir={t.dir}>
      <header className="mkt-hero card">
        <div className="mkt-hero-top">
          <img className="mkt-logo" src="/logo.png" alt="Zomorod logo" />
          <button
            type="button"
            className="btn btn-ghost mkt-lang"
            onClick={() => setLang((s) => (s === "en" ? "ar" : "en"))}
            aria-label="Toggle language"
            title="Toggle language"
          >
            {t.langLabel}
          </button>
        </div>

        <h1 className="mkt-title">{t.brandName}</h1>
        <p className="mkt-tagline">{t.tagline}</p>

        <div className="mkt-cta-row">
          <Link to="/login" className="btn btn-primary mkt-cta">
            {t.ctaStaff}
          </Link>
          <a
            className="btn mkt-cta"
            href="https://api.whatsapp.com/send?phone=962791752686"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.ctaWhatsapp}
          </a>
        </div>
      </header>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.sections.who.title}</h2>
        <p className="mkt-p">{t.sections.who.p1}</p>
        <p className="mkt-p">{t.sections.who.p2}</p>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.sections.products.title}</h2>
        <div className="mkt-grid">
          {t.sections.products.cards.map((c, idx) => (
            <div className="mkt-card" key={idx}>
              <div className="mkt-card-title">{c.title}</div>
              <p className="mkt-card-body">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.sections.operate.title}</h2>
        <p className="mkt-p">{t.sections.operate.p1}</p>
        <p className="mkt-p">{t.sections.operate.p2}</p>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.sections.why.title}</h2>
        <ul className="mkt-list">
          {t.sections.why.bullets.map((b, idx) => (
            <li key={idx}>
              <b>{b.t}:</b> {b.b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section card">
        <h2 className="mkt-h2">{t.sections.contact.title}</h2>
        <p className="mkt-p">{t.sections.contact.p1}</p>

        <div className="mkt-contact">
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">Email</span>
            <a href={`mailto:${t.sections.contact.email}`}>{t.sections.contact.email}</a>
          </div>
          <div className="mkt-contact-row">
            <span className="mkt-contact-label">{lang === "ar" ? "هاتف" : "Phone"}</span>
            <a href="tel:+962791752686">{t.sections.contact.phoneLabel}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
