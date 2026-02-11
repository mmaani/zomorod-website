// src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function SiteHeader({
  lang = "en",
  t,
  whatsappQuoteHref,
  onToggleLang,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const mobileMenuRef = useRef(null);
  const burgerRef = useRef(null);

  const navItems = useMemo(() => {
    const nav = t?.nav || {};
    return [
      { to: "/", label: nav.home || "Company" },
      { to: "/products", label: nav.products || "Products" },
      { to: "/careers", label: nav.careers || "Careers" },
      { to: "/contact", label: nav.contact || "Contact" },
      // ✅ quality after contact
      { to: "/quality", label: nav.quality || "Quality & Compliance" },
    ];
  }, [t]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close on ESC + click outside (when open)
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    function onPointerDown(e) {
      const menuEl = mobileMenuRef.current;
      const burgerEl = burgerRef.current;
      const target = e.target;

      if (!menuEl || !target) return;

      const clickedInsideMenu = menuEl.contains(target);
      const clickedBurger = burgerEl ? burgerEl.contains(target) : false;

      if (!clickedInsideMenu && !clickedBurger) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  const navLinkClass = ({ isActive }) =>
    `site-navlink ${isActive ? "is-active" : ""}`;

  const quoteHref = whatsappQuoteHref || "#";

  function handleToggleLang() {
    try {
      onToggleLang?.();
    } finally {
      setMenuOpen(false);
    }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner card">
        <div className="site-header-row">
          <Link
            to="/"
            className="site-brand"
            aria-label={t?.brandName || "Zomorod"}
            onClick={() => setMenuOpen(false)}
          >
            <img
              className="site-logo"
              src="/logo.png"
              alt={t?.brandShort ? `${t.brandShort} logo` : "Zomorod logo"}
            />
            <div className="site-brand-text">
              <div className="site-brand-short">
                {t?.brandShort || "ZOMOROD"}
              </div>
              {t?.tagline ? (
                <div className="site-brand-tagline">{t.tagline}</div>
              ) : null}
            </div>
          </Link>

          {/* Desktop nav */}
          <nav
            className="site-nav desktop-only"
            aria-label="Primary navigation"
          >
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={navLinkClass}
                end={it.to === "/"}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="site-actions desktop-only">
            <Link to="/login" className="btn btn-ghost">
              {t?.ctaStaff || "Staff Login"}
            </Link>

            <a
              className="btn btn-primary"
              href={quoteHref}
              target={quoteHref === "#" ? undefined : "_blank"}
              rel={quoteHref === "#" ? undefined : "noopener noreferrer"}
              onClick={(e) => {
                if (quoteHref === "#") e.preventDefault();
              }}
            >
              {t?.ctaQuote || "Get a Quote"}
            </a>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleToggleLang}
            >
              {t?.langLabel || (lang === "ar" ? "EN" : "عربي")}
            </button>
          </div>

          {/* Mobile actions */}
          <div className="site-actions mobile-only">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleToggleLang}
            >
              {t?.langLabel || (lang === "ar" ? "EN" : "عربي")}
            </button>

            <button
              ref={burgerRef}
              type="button"
              className="btn btn-ghost site-burger"
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="site-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          id="site-mobile-menu"
          ref={mobileMenuRef}
          className={`site-mobile ${menuOpen ? "is-open" : ""}`}
        >
          <div className="site-mobile-nav" aria-label="Mobile navigation">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={navLinkClass}
                end={it.to === "/"}
                onClick={() => setMenuOpen(false)}
              >
                {it.label}
              </NavLink>
            ))}
          </div>

          <div className="site-mobile-actions">
            <Link
              to="/login"
              className="btn btn-ghost w-full"
              onClick={() => setMenuOpen(false)}
            >
              {t?.ctaStaff || "Staff Login"}
            </Link>

            <a
              className="btn btn-primary w-full"
              href={quoteHref}
              target={quoteHref === "#" ? undefined : "_blank"}
              rel={quoteHref === "#" ? undefined : "noopener noreferrer"}
              onClick={(e) => {
                if (quoteHref === "#") e.preventDefault();
                setMenuOpen(false);
              }}
            >
              {t?.ctaQuote || "Get a Quote"}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
