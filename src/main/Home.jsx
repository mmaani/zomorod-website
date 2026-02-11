// src/main/Home.jsx
import React from "react";
import { Link, useOutletContext } from "react-router-dom";

function LinkedInIcon({ title = "LinkedIn" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
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

function SectionHead({ title, subtitle }) {
  return (
    <div className="page-head">
      <h1 className="page-h1">{title}</h1>
      {subtitle ? <p className="page-sub">{subtitle}</p> : null}
    </div>
  );
}

export default function Home() {
  const { lang, t, whatsappQuoteHref } = useOutletContext();
  const isAr = lang === "ar";

  const mdLinkedInUrl = t?.mdLinkedInUrl || "";
  const mdLinkedInLabel = t?.mdLinkedInLabel || (isAr ? "لينكدإن" : "LinkedIn");

  const COPY = isAr
    ? {
        heroTitle: "حلول توريد احترافية للمستلزمات الطبية",
        heroSub: "",
        sla: "",

        ctaQuote: t.ctaQuote,
        ctaProducts: "تصفح المنتجات",
        ctaCareers: "",

        quickTitle: "نظرة سريعة",
        metrics: [
          { k: "نطاق الخدمة", v: "الأردن وسوريا" },
          { k: "العملاء", v: "صيدليات • موزعون • عيادات • مختبرات" },
          { k: "التجاوب", v: "عرض سعر خلال 48 ساعة عمل" },
        ],

        aboutTitle: "شركة توريد للمشترين المهنيين",
        aboutText:
          "نركز على توريد مستلزمات طبية ومنتجات عناية الأطفال عبر مواصفات ثابتة وتعبئة واضحة وتواصل عملي — بما يناسب الصيدليات والموزعين والعيادات.",
        aboutBullets: [
          "ثبات في المواصفات ووحدات التعبئة عبر الطلبات المتكررة",
          "تنسيق توريد وتنفيذ الطلبات حسب الاحتياج",
          "إرشاد عملي بخصوص المستندات عند الطلب (حسب الوجهة ونوع المنتج)",
        ],

        howTitle: "كيف نعمل",
        steps: [
          {
            t: "1) أرسل طلبك",
            d: "أرسل الفئة + المواصفات + وحدة التعبئة + الكمية + مدينة التسليم عبر واتساب.",
          },
          {
            t: "2) عرض سعر واضح",
            d: "نؤكد التوفر ووحدة التعبئة ونشارك الخيارات المتاحة وفق السوق.",
          },
          {
            t: "3) تأكيد وتنفيذ",
            d: "بعد التأكيد، ننسق التوريد والتغليف والتسليم حسب الاتفاق.",
          },
          {
            t: "4) متابعة بعد البيع",
            d: "نستقبل الملاحظات ونوثقها لتحسين التكرار وتقليل المشاكل.",
          },
        ],

        trustTitle: "معايير تشغيل نركز عليها",
        trust: [
          {
            k: "ثبات المواصفات",
            v: "الأولوية للمنتجات ذات مواصفات وتعبئة قابلة للتكرار.",
          },
          {
            k: "وضوح التعبئة",
            v: "نحدد القطعة/علبة/كرتون لأن ذلك مهم للصيدليات.",
          },
          {
            k: "التتبع عند توفره",
            v: "معلومات دفعة/تشغيلة وتاريخ انتهاء عندما يوفرها المورد.",
          },
          {
            k: "ملاحظة امتثال",
            v: "المتطلبات تختلف حسب الوجهة؛ نوفر إرشاداً عملياً عند الطلب.",
          },
        ],

        mdTitle: "المدير العام",
        mdName: "Mohammad Maani",
        mdRole: "MBA • خبرة 12+ سنة في الإدارة التشغيلية",
        mdBody:
          "يقود الانضباط في التوريد وتنسيق الشركاء وتنفيذ التسليم داخل الأردن والأسواق الإقليمية.",

        contactCta: "تواصل معنا",
      }
    : {
        heroTitle: "Professional medical supply solutions",
        heroSub: "",
        sla: "",

        ctaQuote: t.ctaQuote,
        ctaProducts: "Browse Products",
        ctaCareers: "",

        quickTitle: "At a glance",
        metrics: [
          { k: "Coverage", v: "Jordan & Syria" },
          { k: "Buyers", v: "Pharmacies • Resellers • Clinics • Labs" },
          { k: "Responsiveness", v: "Quote response within 48 business hours" },
        ],

        aboutTitle: "Supply built for professional buyers",
        aboutText:
          "We focus on consistent specifications, clear pack units, and practical communication — supporting pharmacies, resellers, clinics, and laboratories.",
        aboutBullets: [
          "Consistency of specifications and pack units across repeat orders",
          "Procurement and fulfillment coordination based on buyer needs",
          "Destination-aware documentation guidance upon request (varies by product and destination)",
        ],

        howTitle: "How it works",
        steps: [
          {
            t: "1) Send your request",
            d: "WhatsApp: category + specification + pack unit + quantity + delivery city.",
          },
          {
            t: "2) Clear quotation",
            d: "We confirm availability, pack configuration, and offer practical options.",
          },
          {
            t: "3) Confirm & fulfill",
            d: "After confirmation, we coordinate sourcing, packing, and delivery.",
          },
          {
            t: "4) After-sales follow-up",
            d: "We capture feedback to improve repeatability and reduce issues.",
          },
        ],

        trustTitle: "Operating focus",
        trust: [
          {
            k: "Consistency",
            v: "We prioritize repeatable specs and packaging across orders.",
          },
          {
            k: "Pack clarity",
            v: "We confirm unit/box/carton because it matters for resellers.",
          },
          {
            k: "Traceability when available",
            v: "Lot/batch and expiry details when provided upstream.",
          },
          {
            k: "Compliance note",
            v: "Requirements vary by destination; we provide practical guidance on request.",
          },
        ],

        mdTitle: "Managing Director",
        mdName: "Mohammad Maani",
        mdRole: "MBA • 12+ years of operational leadership",
        mdBody:
          "Leads sourcing discipline, partner coordination, and delivery execution across Jordan and regional markets.",

        contactCta: "Contact us",
      };

  return (
    <main className="site-page">
      {/* HERO */}
      <section className="card page-hero">
        <div className="page-hero-grid">
          <div className="page-hero-copy">
            <SectionHead title={COPY.heroTitle} subtitle={COPY.heroSub} />

            <div className="page-hero-actions">
              <Link className="btn btn-ghost" to="/products">
                {COPY.ctaProducts}
              </Link>
            </div>
          </div>

          <div className="page-hero-cards" aria-label={COPY.quickTitle}>
            <div className="card-soft">
              <div className="card-title">{COPY.quickTitle}</div>
              <div className="kv-list">
                {COPY.metrics.map((m) => (
                  <div key={m.k} className="kv">
                    <div className="kv-k">{m.k}</div>
                    <div className="kv-v">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-soft">
              <div className="card-title">{COPY.aboutTitle}</div>
              <p className="muted">{COPY.aboutText}</p>
              <ul className="bullets">
                {COPY.aboutBullets.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="card page-section">
        <h2 className="page-h2">{COPY.howTitle}</h2>
        <div className="steps-grid">
          {COPY.steps.map((s) => (
            <div key={s.t} className="card-soft step">
              <div className="step-title">{s.t}</div>
              <div className="muted">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST + MD */}
      <section className="card page-section">
        <div className="two-col">
          <div>
            <h2 className="page-h2">{COPY.trustTitle}</h2>
            <div className="trust-grid">
              {COPY.trust.map((x) => (
                <div key={x.k} className="card-soft trust-item">
                  <div className="trust-k">{x.k}</div>
                  <div className="muted">{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card-soft md-card">
              <div className="md-title">{COPY.mdTitle}</div>
              <div className="md-name">{COPY.mdName}</div>

              {/* LinkedIn (Managing Director only) */}
              <div className="md-links-undername">
                {mdLinkedInUrl ? (
                  <a
                    className="md-linkedin-undername"
                    href={mdLinkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={mdLinkedInLabel}
                  >
                    <span className="md-linkedin-icon" aria-hidden="true">
                      <LinkedInIcon title={mdLinkedInLabel} />
                    </span>
                    <span>{mdLinkedInLabel}</span>
                  </a>
                ) : null}
              </div>

              <div className="muted">{COPY.mdRole}</div>
              <div className="md-body">{COPY.mdBody}</div>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
