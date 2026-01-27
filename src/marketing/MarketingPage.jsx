import React from "react";
import { Link } from "react-router-dom";

export default function MarketingPage() {
  return (
    <main className="marketing-page" style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <img
          src="/logo.png"
          alt="Zomorod Medical Supplies LLC logo"
          style={{ width: 120, height: 120, objectFit: "contain" }}
        />
        <h1 style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
          Zomorod Medical Supplies LLC
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#555" }}>
          Your trusted partner for high‑quality medical consumables and supplies in Jordan.
        </p>
      </header>

      {/* Who We Are */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Who We Are</h2>
        <p>
          Zomorod Medical Supplies is an Amman‑based provider of high‑quality medical
          consumables and equipment. We partner with respected manufacturers worldwide
          to bring innovative products to clinics, hospitals and distributors across Jordan.
          Our mission is to ensure healthcare providers have access to safe, reliable and
          competitively priced products supported by thorough documentation and local expertise.
        </p>
        <p>
          As a trusted distributor, we act as agents for well‑known global companies and
          work hard to deliver integrated medical solutions that meet the stringent demands
          of modern healthcare.
        </p>
      </section>

      {/* Our Products */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Our Products</h2>
        <div className="grid">
          <div className="card">
            <div className="card__label">Personal Protective Equipment</div>
            <p className="card__value">
              Face masks, gloves, gowns, shoe covers and other PPE to keep
              healthcare professionals and patients safe.
            </p>
          </div>
          <div className="card">
            <div className="card__label">Medical Consumables</div>
            <p className="card__value">
              Syringes, catheters, infusion sets, dressings and sterile kits
              sourced from trusted manufacturers to ensure quality and safety.
            </p>
          </div>
          <div className="card">
            <div className="card__label">Equipment & Devices</div>
            <p className="card__value">
              Diagnostic tools, monitoring devices, surgical instruments and
              supporting equipment chosen for reliability and compliance.
            </p>
          </div>
        </div>
      </section>

      {/* Where We Operate */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Where We Operate</h2>
        <p>
          Headquartered in Amman, we distribute medical supplies throughout Jordan’s hospitals,
          clinics and laboratories and support partners across the wider Middle East. Jordan devotes
          around nine percent of its GDP to healthcare and operates more than one hundred hospitals,
          giving the country one of the region’s strongest healthcare infrastructures:contentReference[oaicite:0]{index=0}.
          This foundation, along with Jordan’s reputation as a regional healthcare leader and medical
          tourism destination:contentReference[oaicite:1]{index=1}, allows us to efficiently deliver our products wherever
          they are needed.
        </p>
        <p>
          By leveraging our logistics network and partnerships with global manufacturers, we ensure timely
          delivery and ongoing support for healthcare providers not only in Jordan but also in neighbouring
          markets across the Middle East. Whether you’re a hospital in Amman or a clinic elsewhere in the region,
          Zomorod stands ready to supply high‑quality consumables, personal protective equipment and specialised devices.
        </p>
      </section>

      {/* Why Choose Us */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Why Choose Zomorod?</h2>
        <ul style={{ listStyle: "disc", paddingLeft: "20px", lineHeight: 1.8 }}>
          <li>
            <strong>Quality assurance:</strong> We source from reputable manufacturers and
            inspect every shipment to ensure products meet international standards:contentReference[oaicite:2]{index=2}.
          </li>
          <li>
            <strong>Complete documentation:</strong> All consumables and equipment include certificates
            of compliance and are supported by detailed documentation for regulatory purposes.
          </li>
          <li>
            <strong>Competitive pricing:</strong> Our local presence and relationships with suppliers allow
            us to offer fair prices and volume discounts.
          </li>
          <li>
            <strong>Reliable distribution:</strong> We provide timely delivery to hospitals, clinics and
            distributors across Jordan, backed by local after‑sales support:contentReference[oaicite:3]{index=3}.
          </li>
        </ul>
      </section>

      {/* Get in Touch */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Get in Touch</h2>
        <p>
          To request a quote, place an order or learn more about our product range,
          please reach out via email, phone or WhatsApp.
        </p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a>
          </li>
          <li>
            <strong>Phone:</strong>{" "}
            <a href="tel:+962791752686">+962 79 175 2686</a>
          </li>
        </ul>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <Link to="/login" className="button button--primary" style={{ flex: 1, textAlign: "center" }}>
            Staff Login
          </Link>
          <a
            href="https://api.whatsapp.com/send?phone=962791752686"
            className="button button--ghost"
            style={{ flex: 1, textAlign: "center" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message us on WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
