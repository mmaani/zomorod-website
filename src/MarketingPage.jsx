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

      <section style={{ marginBottom: "2rem" }}>
        <h2>Quality‑focused sourcing</h2>
        <p>
          We specialize in sourcing medical consumables from reputable manufacturers and deliver them
          across Jordan with full documentation readiness and competitive pricing. Whether you’re a
          healthcare provider, clinic or distributor, we ensure that every product meets regulatory
          standards and your expectations.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Get in touch</h2>
        <p>
          To request a quote or to learn more about our product range, reach out via email or call us.
        </p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <strong>Email:</strong> <a href="mailto:info@zomorodmedical.com">info@zomorodmedical.com</a>
          </li>
          <li>
            <strong>Phone:</strong> <a href="tel:+962791752686">+962 79 175 2686</a>
          </li>
        </ul>
      </section>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
    </main>
  );
}
