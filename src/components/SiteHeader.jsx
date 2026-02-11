// src/components/SiteHeader.jsx
import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function SiteHeader({
  lang = "en",
  t,
  whatsappQuoteHref,
  onToggleLang,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = useMemo(() => {
    const nav = t?.nav || {};
    return [
      { to: "/", label: nav.home || "Company" },
      { to: "/products", label: nav.products || "Products" },
      { to: "/careers", label: nav.careers || "Careers" },
      { to: "/contact", label: nav.contact || "Contact" },
      // ✅ you asked: quality after contact
      { to: "/quality", label: nav.quality || "Quality & Compliance" },
    ];
  }, [t]);

  // Close menu on route change (mobile)
  React.useEffect(() => {
    setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `site-navlink ${isActive ? "is-active" : ""}`;

  return (
    <header className="site-header">
      <div className="site-header-inner card">
        <div className="site-header-row">
          <Link to="/" className="site-brand" aria-label={t?.brandName || "Zomorod"}>
            <img className="site-logo" src="/logo.png" alt="" />
            <div className="site-brand-text">
              <div className="site-brand-short">{t?.brandShort || "ZOMOROD"}</div>
              <div className="site-brand-tagline">{t?.tagline || ""}</div>
            </div>
          </Link>

          <nav className="site-nav desktop-only" aria-label="Primary navigation">
            {navItems.map((it) => (
              <NavLink key={it.to} to={it.to} className={navLinkClass} end={it.to === "/"}>
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-actions desktop-only">
            <Link to="/login" className="btn btn-ghost">
              {t?.ctaStaff || "Staff Login"}
            </Link>
            <a
              className="btn btn-primary"
              href={whatsappQuoteHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t?.ctaQuote || "Get a Quote"}
            </a>

            <button type="button" className="btn btn-ghost" onClick={onToggleLang}>
              {t?.langLabel || (lang === "ar" ? "EN" : "عربي")}
            </button>
          </div>

          {/* Mobile actions */}
          <div className="site-actions mobile-only">
            <button type="button" className="btn btn-ghost" onClick={onToggleLang}>
              {t?.langLabel || (lang === "ar" ? "EN" : "عربي")}
            </button>

            <button
              type="button"
              className="btn btn-ghost site-burger"
              aria-label="Menu"
              aria-expanded={menuOpen ? "true" : "false"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`site-mobile ${menuOpen ? "is-open" : ""}`}>
          <div className="site-mobile-nav" aria-label="Mobile navigation">
            {navItems.map((it) => (
              <NavLink key={it.to} to={it.to} className={navLinkClass} end={it.to === "/"}>
                {it.label}
              </NavLink>
            ))}
          </div>

          <div className="site-mobile-actions">
            <Link to="/login" className="btn btn-ghost w-full">
              {t?.ctaStaff || "Staff Login"}
            </Link>
            <a
              className="btn btn-primary w-full"
              href={whatsappQuoteHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t?.ctaQuote || "Get a Quote"}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
