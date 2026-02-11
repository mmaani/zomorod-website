// src/main/Quality.jsx
import React, { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";

export default function Quality() {
  const { lang, t, whatsappQuoteHref } = useOutletContext();
  const isAr = lang === "ar";

  const copy = useMemo(() => {
    if (isAr) {
      return {
        title: "الجودة والامتثال",
        subtitle:
          "في زمرد، نركز على حماية سلامة المنتج عبر التوريد والتخزين والتسليم، بما يدعم مشتريات الجهات المهنية بثقة. يستند نهجنا إلى ضوابط عملية تتوافق مع مبادئ الممارسات الجيدة لتخزين وتوزيع المنتجات الطبية.",
        sections: [
          {
            title: "تأهيل الموردين وضوابط التوريد",
            cols: [
              {
                h: "ما الذي نقوم به",
                items: [
                  "قائمة موردين معتمدين ومراجعة قبل أول عملية توريد.",
                  "تفضيل الموردين/المصنعين القادرين على تقديم مستندات قابلة للتحقق ومواصفات ثابتة.",
                  "تأكيد المواصفات (المواد، المقاسات، وحدات التعبئة، الملصقات) قبل اعتماد الطلب.",
                  "إعادة التقييم عند وجود مشاكل (شكاوى جودة، نقص مستندات، عدم ثبات).",
                ],
              },
              {
                h: "ما الذي نطلبه عند الاقتضاء",
                items: [
                  "مستندات المصنع/العلامة، وشهادات الجودة، ووصف المنتج/المواصفات (حسب نوع المنتج والوجهة).",
                ],
              },
            ],
          },
          {
            title: "المستندات والاستعداد التنظيمي (حسب الوجهة)",
            cols: [
              {
                h: "نماذج مستندات يمكن دعمها عند الاقتضاء",
                items: [
                  "مواصفات المنتج/وحدة التعبئة والتغليف",
                  "رقم التشغيلة/الدفعة وتاريخ الانتهاء (عند توفره)",
                  "شهادات/إقرارات يقدمها المصنع (عند الملاءمة)",
                ],
              },
              {
                h: "ملاحظة مهمة",
                items: [
                  "نقدم إرشاداً وفق احتياج العميل وتوقعات الوجهة، لكن مسؤولية الامتثال النهائية تقع على المستورد ومتطلبات الجهات المختصة في بلد الوجهة.",
                ],
              },
            ],
          },
          {
            title: "التتبع عبر رقم التشغيلة/الدفعة والسجلات",
            cols: [
              {
                h: "كيف ندير التتبع",
                items: [
                  "تسجيل رقم التشغيلة/الدفعة وتاريخ الانتهاء والمورد وتاريخ الشراء عند توفرها.",
                  "حفظ سجلات تساعدنا على تحديد الدفعات المتأثرة وعزل المخزون عند وجود ملاحظة جودة.",
                  "تطبيق مبدأ الأقرب انتهاءً أولاً (FEFO) حيثما كان تاريخ الانتهاء مؤثراً.",
                ],
              },
              {
                h: "لماذا هذا مهم؟",
                items: [
                  "يتسق ذلك مع مبادئ الممارسات الجيدة للتخزين والتوزيع التي تؤكد على التتبع والتحكم عبر سلسلة الإمداد.",
                ],
              },
            ],
          },
          {
            title: "ظروف التخزين وسلامة المنتج",
            cols: [
              {
                h: "ضوابط رئيسية",
                items: [
                  "تخزين وتداول منظم ونظيف، مع عزل المواد التالفة/غير المطابقة.",
                  "حماية العبوات لتقليل مخاطر التلف أو الخلط أو التلوث.",
                  "احتياطات درجة الحرارة والتداول عند الحاجة وفق متطلبات المنتج وإرشادات المورد.",
                ],
              },
              {
                h: "مبدأ العمل",
                items: [
                  "نطبق ضوابط أساسية بما يتناسب مع حساسية المنتج ومتطلبات التعامل معه.",
                ],
              },
            ],
          },
          {
            title: "ضوابط التوزيع والتسليم",
            cols: [
              {
                h: "ما نركز عليه",
                items: [
                  "توضيح وحدات التعبئة (قطعة/علبة/10/100…) والملصقات.",
                  "ممارسات عملية تتماشى مع مبادئ التوزيع الجيد.",
                  "الحفاظ على سلامة المنتج واستمرارية المستندات قدر الإمكان خلال التنفيذ.",
                ],
              },
            ],
          },
          {
            title: "الشكاوى والإرجاع ودعم الاستدعاء (Recall)",
            cols: [
              {
                h: "إدارة الشكاوى",
                items: [
                  "تسجيل الشكوى وطلب التفاصيل/الصور وتحديد النطاق (المنتج، الدفعة، المورد).",
                  "عزل المخزون المتأثر عند الاقتضاء والتنسيق للإجراءات التصحيحية.",
                ],
              },
              {
                h: "الإرجاع ودعم الاستدعاء",
                items: [
                  "الإرجاع يتم وفق حالة المنتج وطبيعته واتفاق العميل.",
                  "عند وجود استدعاء من المصنع أو الجهات المختصة، ندعم تحديد الدفعات المتأثرة والتواصل مع العملاء.",
                  "نعتمد نهجاً مبنياً على المخاطر مع الالتزام بمتطلبات الوجهة.",
                ],
              },
            ],
          },
          {
            title: "إرشاد الامتثال حسب الوجهة (الأردن وسوريا)",
            cols: [
              {
                h: "كيف نساعد",
                items: [
                  "تأكيد وحدة التعبئة والملصقات المطلوبة",
                  "توضيح المستندات المطلوبة عادةً حسب الفئة",
                  "اقتراح بدائل عملية عند عدم توفر علامة/مستند محدد",
                ],
              },
              {
                h: "تنبيه",
                items: [
                  "قد تختلف المتطلبات بين الأردن وسوريا حسب فئة المنتج وتحديثات الجهات المختصة.",
                ],
              },
            ],
          },
        ],
        ctaTitle: "تحتاج عرض سعر أو دعم مستندات؟",
        ctaText:
          "أرسل طلبك عبر واتساب متضمناً: الفئة، المواصفات، وحدة التعبئة، الكمية، ومدينة/وجهة التسليم.",
        ctaWhatsApp: "واتساب — طلب عرض سعر",
        ctaContact: "صفحة التواصل",
        refsTitle: "مراجع (للاطلاع)",
        refs: [
          {
            label:
              "WHO — Good storage and distribution practices for medical products (TRS 1025 includes Annex content)",
            href: "https://www.who.int/publications/i/item/9789240028963",
          },
          {
            label:
              "EU — Guidelines on Good Distribution Practice of medicinal products for human use (2013/C 343/01)",
            href: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:52013XC1123(01)",
          },
          {
            label:
              "ISO 13485:2016 — Quality management systems for medical devices",
            href: "https://www.iso.org/standard/59752.html",
          },
        ],
      };
    }

    return {
      title: "Quality & Compliance",
      subtitle:
        "At Zomorod, we aim to protect product integrity across sourcing, storage, and delivery—so professional buyers can order with confidence. Our approach is guided by practical supply-chain controls consistent with recognized good storage and distribution principles for medical products.",
      sections: [
        {
          title: "Supplier qualification & sourcing controls",
          cols: [
            {
              h: "What we do",
              items: [
                "Maintain an approved supplier list and review suppliers before first procurement.",
                "Prefer suppliers/manufacturers that can provide verifiable documentation and stable, repeatable specifications.",
                "Confirm product specifications (materials, sizes, packing units, labeling) before order confirmation.",
                "Re-check suppliers when issues occur (quality complaints, documentation gaps, inconsistencies).",
              ],
            },
            {
              h: "What we request (where applicable)",
              items: [
                "Manufacturer/brand documentation, quality certificates, product datasheets, and conformity evidence (varies by product type and destination).",
              ],
            },
          ],
        },
        {
          title: "Documentation & regulatory readiness (destination-aware)",
          cols: [
            {
              h: "Typical documentation we can support (as applicable)",
              items: [
                "Product specification sheet / packing configuration",
                "Lot/batch and expiry information (when available)",
                "Certificates and declarations provided by manufacturers (where relevant)",
              ],
            },
            {
              h: "Important note",
              items: [
                "We provide guidance based on buyer needs and destination expectations, but final compliance responsibility remains with the importer and the competent authorities’ requirements at destination.",
              ],
            },
          ],
        },
        {
          title: "Batch/Lot traceability & records",
          cols: [
            {
              h: "How we handle traceability",
              items: [
                "Capture lot/batch, expiry, supplier, and purchase date information when available.",
                "Keep internal records that allow us to identify affected batches and isolate stock if a quality concern arises.",
                "Apply practical first-expiry-first-out (FEFO) handling where expiry is relevant.",
              ],
            },
            {
              h: "Why this matters",
              items: [
                "This aligns with good distribution/storage expectations that emphasize traceability and controlled handling through the supply chain.",
              ],
            },
          ],
        },
        {
          title: "Storage conditions & product integrity",
          cols: [
            {
              h: "Key controls",
              items: [
                "Clean, organized storage and handling; segregation of damaged/nonconforming items.",
                "Packaging protection to reduce risk of contamination, damage, or mix-ups.",
                "Temperature/handling precautions where relevant (based on product requirements and supplier guidance).",
              ],
            },
            {
              h: "Approach",
              items: [
                "We apply basic controls proportionate to product sensitivity to protect integrity during storage and handling.",
              ],
            },
          ],
        },
        {
          title: "Distribution & delivery controls",
          cols: [
            {
              h: "What we focus on",
              items: [
                "Clear packing configuration and labeling instructions (pack units matter for pharmacies/resellers).",
                "Practical chain-of-custody handling aligned with distribution good practices.",
                "Preserving product condition and documentation continuity during fulfillment coordination.",
              ],
            },
          ],
        },
        {
          title: "Complaints, returns & recall support",
          cols: [
            {
              h: "Complaint handling",
              items: [
                "Log the complaint, request photos/details, and assess scope (product, lot/batch, supplier).",
                "Quarantine affected stock where applicable and coordinate corrective actions.",
              ],
            },
            {
              h: "Returns & recall support",
              items: [
                "Returns are handled case-by-case depending on product type, condition, and buyer agreement.",
                "If a manufacturer or authority recall occurs, we support identification of affected lots and communication to buyers.",
                "We align actions to recognized recall concepts used in regulated systems (risk-based response), while following destination requirements.",
              ],
            },
          ],
        },
        {
          title: "Destination-specific compliance guidance (Jordan & Syria)",
          cols: [
            {
              h: "How we help buyers",
              items: [
                "Confirming the exact pack unit and labeling expectations",
                "Advising what documentation is typically requested for that category",
                "Offering practical alternatives when a specific brand/document is not available",
              ],
            },
            {
              h: "Note",
              items: [
                "Requirements can differ by destination and product category and may change over time.",
              ],
            },
          ],
        },
      ],
      ctaTitle: "Need documentation support or a quote?",
      ctaText:
        "Send a WhatsApp quote request with: category, specification, pack unit, quantity, and destination city.",
      ctaWhatsApp: "WhatsApp — Request a Quote",
      ctaContact: "Go to Contact",
      refsTitle: "References (for context)",
      refs: [
        {
          label:
            "WHO — Good storage and distribution practices for medical products (TRS 1025 includes Annex content)",
          href: "https://www.who.int/publications/i/item/9789240028963",
        },
        {
          label:
            "EU — Guidelines on Good Distribution Practice of medicinal products for human use (2013/C 343/01)",
          href: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:52013XC1123(01)",
        },
        {
          label:
            "ISO 13485:2016 — Quality management systems for medical devices",
          href: "https://www.iso.org/standard/59752.html",
        },
      ],
    };
  }, [isAr]);

  return (
    <div className="page">
      <section className="card page-section">
        <div className="page-head">
          <h1 className="h1" style={{ marginBottom: 8 }}>
            {copy.title}
          </h1>
          <p className="p" style={{ marginBottom: 0 }}>
            {copy.subtitle}
          </p>

          <div className="row" style={{ marginTop: 12 }}>
            <a
              className="btn btn-primary"
              href={whatsappQuoteHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.ctaWhatsApp}
            </a>
            <Link className="btn btn-ghost" to="/contact">
              {copy.ctaContact}
            </Link>
            <span className="spacer" />
            <span className="badge">
              {t?.responseSla ||
                (isAr
                  ? "الرد خلال 48 ساعة عمل."
                  : "Reply within 48 business hours.")}
            </span>
          </div>
        </div>
      </section>

      {copy.sections.map((s, idx) => (
        <section key={s.title} className="card page-section">
          <h2 className="h2" style={{ marginBottom: 10 }}>
            {idx + 1}) {s.title}
          </h2>

          <div className={`grid ${s.cols.length > 1 ? "grid-2" : ""}`}>
            {s.cols.map((c) => (
              <div key={c.h} className="card-soft">
                <div className="mkt-card-title" style={{ marginBottom: 8 }}>
                  {c.h}
                </div>
                <ul className="mkt-list" style={{ margin: 0 }}>
                  {c.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card page-section">
        <div className="grid grid-2">
          <div className="card-soft">
            <h2 className="h2" style={{ marginBottom: 8 }}>
              {copy.ctaTitle}
            </h2>
            <p className="p" style={{ marginTop: 0 }}>
              {copy.ctaText}
            </p>
            <div className="row">
              <a
                className="btn btn-primary"
                href={whatsappQuoteHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.ctaWhatsApp}
              </a>
              <Link className="btn btn-ghost" to="/products">
                {isAr ? "المنتجات" : "Products"}
              </Link>
            </div>
          </div>

          <div className="card-soft">
            <div className="mkt-card-title" style={{ marginBottom: 8 }}>
              {copy.refsTitle}
            </div>
            <ul className="mkt-list" style={{ margin: 0 }}>
              {copy.refs.map((r) => (
                <li key={r.href}>
                  <a
                    className="ltr"
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <bdi>{r.label}</bdi>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
