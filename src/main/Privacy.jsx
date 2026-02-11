// src/main/Privacy.jsx
import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const PRIVACY_COPY = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated",
    intro:
      "This Privacy Policy explains how Zomorod Medical Supplies LLC (“Zomorod”, “we”, “us”) collects, uses, and protects personal data when you use this website.",
    sections: [
      {
        h: "1) Data controller",
        body: (
          <>
            Zomorod Medical Supplies LLC
            <br />
            Sport City Circle, Amman, Jordan
            <br />
            Email:{" "}
            <a className="ltr" href="mailto:info@zomorodmedical.com">
              <bdi>info@zomorodmedical.com</bdi>
            </a>
          </>
        ),
      },
      {
        h: "2) Data we collect",
        list: [
          {
            b: "Contact messages:",
            t: "name, email, phone number, and the content of your request (if you email us).",
          },
          {
            b: "Recruitment applications (if enabled):",
            t: "name, email, phone, country/city, education level, CV file, and optional cover letter.",
          },
          {
            b: "Technical data:",
            t: "basic logs needed to operate and secure the site (e.g., IP address, timestamps), collected by hosting and security systems.",
          },
        ],
      },
      {
        h: "3) How we use your data",
        list: [
          { t: "To respond to quote requests and business inquiries." },
          { t: "To process recruitment applications and communicate with applicants." },
          { t: "To maintain site security, prevent abuse, and improve reliability." },
        ],
      },
      {
        h: "4) Sharing",
        body:
          "We do not sell personal data. We may share limited data with service providers that help us run the website (hosting, email delivery, file storage) and only as needed to provide the service.",
      },
      {
        h: "5) Retention",
        body:
          "We retain data only as long as necessary for the purposes described above, unless a longer period is required for legitimate business needs or legal obligations. Recruitment files may be kept for a reasonable period to evaluate candidates and maintain hiring records.",
      },
      {
        h: "6) Security",
        body:
          "We use reasonable administrative and technical measures to protect data. However, no system can be guaranteed 100% secure.",
      },
      {
        h: "7) Your choices",
        body:
          "You may request access, correction, or deletion of your personal data by emailing us.",
      },
      {
        h: "8) Updates",
        body:
          "We may update this policy from time to time. The latest version will be posted on this page.",
      },
    ],
  },

  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث",
    intro:
      "توضح هذه السياسة كيفية قيام شركة زمرد للمستلزمات الطبية ذ.م.م (“زمرد”، “نحن”) بجمع واستخدام وحماية البيانات الشخصية عند استخدامك لهذا الموقع.",
    sections: [
      {
        h: "1) الجهة المتحكمة بالبيانات",
        body: (
          <>
            شركة زمرد للمستلزمات الطبية ذ.م.م
            <br />
            Sport City Circle, Amman, Jordan
            <br />
            البريد الإلكتروني:{" "}
            <a className="ltr" href="mailto:info@zomorodmedical.com">
              <bdi>info@zomorodmedical.com</bdi>
            </a>
          </>
        ),
      },
      {
        h: "2) البيانات التي نجمعها",
        list: [
          {
            b: "رسائل التواصل:",
            t: "الاسم والبريد الإلكتروني ورقم الهاتف ومحتوى الطلب (في حال مراسلتنا عبر البريد).",
          },
          {
            b: "طلبات التوظيف (إذا كانت مفعّلة):",
            t: "الاسم والبريد الإلكتروني ورقم الهاتف والبلد/المدينة والمؤهل العلمي وملف السيرة الذاتية ورسالة تغطية اختيارية.",
          },
          {
            b: "بيانات تقنية:",
            t: "سجلات تشغيل أساسية لازمة لأمن الموقع وموثوقيته (مثل عنوان IP والطوابع الزمنية)، تجمعها أنظمة الاستضافة والحماية.",
          },
        ],
      },
      {
        h: "3) كيف نستخدم بياناتك",
        list: [
          { t: "للرد على طلبات عروض الأسعار والاستفسارات التجارية." },
          { t: "لمعالجة طلبات التوظيف والتواصل مع المتقدمين." },
          { t: "لأمن الموقع ومنع إساءة الاستخدام وتحسين الموثوقية." },
        ],
      },
      {
        h: "4) مشاركة البيانات",
        body:
          "لا نقوم ببيع البيانات الشخصية. قد نشارك بيانات محدودة مع مزودي خدمات يساعدوننا في تشغيل الموقع (الاستضافة، البريد، التخزين) وبالقدر اللازم لتقديم الخدمة.",
      },
      {
        h: "5) مدة الاحتفاظ",
        body:
          "نحتفظ بالبيانات فقط للمدة اللازمة للأغراض المذكورة أعلاه، ما لم تلزم مدة أطول لاحتياجات تشغيلية مشروعة أو التزامات قانونية. قد تُحفظ ملفات التوظيف لمدة معقولة لتقييم المرشحين والاحتفاظ بسجلات التوظيف.",
      },
      {
        h: "6) الأمان",
        body:
          "نستخدم تدابير إدارية وتقنية معقولة لحماية البيانات، ومع ذلك لا يمكن ضمان الأمان بنسبة 100%.",
      },
      {
        h: "7) خياراتك",
        body:
          "يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عبر مراسلتنا بالبريد الإلكتروني.",
      },
      {
        h: "8) التحديثات",
        body:
          "قد نقوم بتحديث هذه السياسة من وقت لآخر، وسيتم نشر أحدث نسخة على هذه الصفحة.",
      },
    ],
  },
};

export default function Privacy() {
  const { lang } = useOutletContext();
  const isAr = lang === "ar";

  const c = useMemo(() => (isAr ? PRIVACY_COPY.ar : PRIVACY_COPY.en), [isAr]);

  const today = useMemo(() => {
    try {
      return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    } catch {
      return "";
    }
  }, []);

  return (
    <div className="page">
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h2">{c.title}</h1>
          <p className="p">{c.intro}</p>

          <div className="badge" style={{ width: "fit-content" }}>
            {c.updated}: <bdi style={{ marginInlineStart: 6 }}>{today}</bdi>
          </div>
        </div>

        <div className="hr" />

        <div className="grid" style={{ gap: 14 }}>
          {c.sections.map((s) => (
            <div key={s.h} className="card" style={{ padding: 16, background: "rgba(255,255,255,.03)" }}>
              <div className="h2" style={{ fontSize: 16, margin: 0 }}>
                {s.h}
              </div>

              {"body" in s ? (
                <p className="p" style={{ marginTop: 8, marginBottom: 0 }}>
                  {s.body}
                </p>
              ) : null}

              {"list" in s ? (
                <ul className="mkt-list" style={{ marginTop: 10 }}>
                  {s.list.map((it, idx) => (
                    <li key={idx}>
                      {it.b ? <strong>{it.b} </strong> : null}
                      {it.t}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
