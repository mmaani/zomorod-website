// src/main/Terms.jsx
import React, { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";

export default function Terms() {
  const outlet = useOutletContext() || {};
  const lang = outlet.lang || "en";
  const isAr = lang === "ar";

  const c = useMemo(() => {
    if (isAr) {
      return {
        title: "شروط الاستخدام",
        intro:
          "تحكم هذه الشروط استخدامك لهذا الموقع الذي تديره شركة زمرد للمستلزمات الطبية ذ.م.م (“زمرد”). باستخدامك للموقع، فإنك توافق على هذه الشروط.",
        sections: [
          {
            h: "1) معلومات الشركة",
            body: (
              <>
                <b>شركة زمرد للمستلزمات الطبيه ذ.م.م</b>
                <br />
                العنوان: <span className="ltr">Sport City Circle, Amman, Jordan</span>
                <br />
                الرقم الوطني: <bdi>200182261</bdi> • رقم التسجيل: <bdi>60228</bdi>
                <br />
                البريد:{" "}
                <a className="ltr" href="mailto:info@zomorodmedical.com">
                  <bdi>info@zomorodmedical.com</bdi>
                </a>
              </>
            ),
          },
          {
            h: "2) طبيعة المعلومات (لا تُعد استشارة)",
            body:
              "المحتوى المعروض على هذا الموقع لأغراض معلوماتية وتجارية عامة فقط، ولا يشكل استشارة طبية أو تنظيمية أو قانونية.",
          },
          {
            h: "3) عروض الأسعار والتوفر والمستندات",
            body:
              "عروض الأسعار والتوفر خاضعة للتأكيد عند الطلب. قد تختلف متطلبات تصنيف المنتج والاستيراد والمستندات حسب الوجهة ونوع المنتج. قد نوفر المستندات المتاحة وإرشادات عملية عند الطلب؛ وتبقى مسؤولية الامتثال النهائية على المستورد والجهات المختصة في بلد الوجهة.",
          },
          {
            h: "4) الاستخدام المقبول",
            body:
              "توافق على عدم إساءة استخدام الموقع أو محاولة الوصول غير المصرح به إلى أي جزء منه أو تعطيل خدماته أو نسخ محتواه بشكل غير قانوني.",
          },
          {
            h: "5) الملكية الفكرية",
            body:
              "جميع العلامات التجارية والشعارات والمحتوى على هذا الموقع مملوكة لزمرد أو مستخدمة بإذن. لا يجوز نسخها أو إعادة استخدامها دون موافقة خطية مسبقة.",
          },
          {
            h: "6) حدود المسؤولية",
            body:
              "إلى الحد الأقصى الذي يسمح به القانون، لا تتحمل زمرد المسؤولية عن أي خسائر غير مباشرة أو تبعية ناتجة عن استخدام الموقع.",
          },
          {
            h: "7) القانون الناظم والاختصاص القضائي",
            body:
              "تخضع هذه الشروط للقوانين المعمول بها في الزرقاء – الأردن، وتكون المحاكم المختصة في تلك الولاية القضائية مختصة بأي نزاع.",
          },
          {
            h: "8) التحديثات",
            body:
              "قد نقوم بتحديث هذه الشروط من وقت لآخر. سيتم نشر أحدث نسخة على هذه الصفحة.",
          },
        ],
        linksTitle: "روابط",
        links: {
          privacy: "سياسة الخصوصية",
          contact: "التواصل",
        },
      };
    }

    return {
      title: "Terms of Use",
      intro:
        "These Terms govern your use of this website operated by Zomorod Medical Supplies LLC (“Zomorod”, “we”, “us”). By accessing the site, you agree to these Terms.",
      sections: [
        {
          h: "1) Business information",
          body: (
            <>
              <b>Zomorod Medical Supplies LLC</b>
              <br />
              Address: <span className="ltr">Sport City Circle, Amman, Jordan</span>
              <br />
              National ID: <bdi>200182261</bdi> • Registration No.: <bdi>60228</bdi>
              <br />
              Email:{" "}
              <a className="ltr" href="mailto:info@zomorodmedical.com">
                <bdi>info@zomorodmedical.com</bdi>
              </a>
            </>
          ),
        },
        {
          h: "2) No professional advice",
          body:
            "Information on this website is for general business purposes only and does not constitute medical, regulatory, or legal advice.",
        },
        {
          h: "3) Quotes, availability, and documentation",
          body:
            "Quotes and availability are subject to confirmation. Product classification and import documentation requirements vary by destination and product type. We can share available documentation and practical guidance upon request; final compliance responsibility remains with the importer and applicable authorities.",
        },
        {
          h: "4) Acceptable use",
          body:
            "You agree not to misuse the website, attempt unauthorized access, disrupt services, or copy/redistribute content unlawfully.",
        },
        {
          h: "5) Intellectual property",
          body:
            "All trademarks, logos, and website content are owned by Zomorod or used with permission. You may not copy or reuse them without written approval.",
        },
        {
          h: "6) Limitation of liability",
          body:
            "To the maximum extent permitted by law, Zomorod is not liable for indirect or consequential losses arising from use of this website.",
        },
        {
          h: "7) Governing law and jurisdiction",
          body:
            "These Terms are governed by the laws applicable in Zarqa, Jordan, and disputes shall be subject to the competent courts in that jurisdiction.",
        },
        {
          h: "8) Updates",
          body:
            "We may update these Terms from time to time. The latest version will be posted on this page.",
        },
      ],
      linksTitle: "Links",
      links: {
        privacy: "Privacy Policy",
        contact: "Contact",
      },
    };
  }, [isAr]);

  return (
    <main className="page">
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h2" style={{ margin: 0 }}>
            {c.title}
          </h1>
          <p className="p" style={{ margin: 0 }}>
            {c.intro}
          </p>
        </div>

        <div className="hr" />

        <div className="grid" style={{ gap: 12 }}>
          {c.sections.map((s) => (
            <div key={s.h} className="card-soft">
              <div className="mkt-card-title">{s.h}</div>
              <div className="mkt-card-body">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="hr" />

        <div className="row">
          <div className="muted" style={{ fontWeight: 800 }}>
            {c.linksTitle}:
          </div>
          <Link to="/privacy">{c.links.privacy}</Link>
          <span className="muted">•</span>
          <Link to="/contact">{c.links.contact}</Link>
        </div>
      </section>
    </main>
  );
}
