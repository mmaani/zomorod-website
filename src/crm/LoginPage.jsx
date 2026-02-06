import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { forgotPassword, login, isLoggedIn, getRememberFlag } from "./auth.js";
import "./crm.css";

function normalizePath(p) {
  if (!p) return null;
  const s = String(p);
  if (!s) return null;
  return s.startsWith("/") ? s : `/${s}`;
}

function normalizeEmailForLogin(value) {
  const email = String(value || "").trim().toLowerCase();
  // Common typo we repeatedly see in support tickets.
  return email.replace("@zoomorodmedical.com", "@zomorodmedical.com");
}


export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return getRememberFlag();
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const fallback = "/crm/dashboard";
    const raw = location.state?.from;

    if (typeof raw === "string") {
      const p = normalizePath(raw);
      if (p && p !== "/crm/login") return p;
      return fallback;
    }

    if (raw && typeof raw === "object" && typeof raw.pathname === "string") {
      const p = normalizePath(raw.pathname);
      const s = raw.search || "";
      const h = raw.hash || "";
      const full = `${p || ""}${s}${h}`;
      if (full.startsWith("/") && full !== "/crm/login") return full;
    }

    return fallback;
  }, [location]);

  useEffect(() => {
    if (isLoggedIn()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      await login(email.trim(), password, rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }
    async function onForgotPassword(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setResetLoading(true);
    try {
      await forgotPassword(normalizeEmailForLogin(email));
      setInfo("If this email is valid, we sent a temporary CRM password.");
    } catch (err) {
      setError(err?.message || "Failed to process password reset.");
    } finally {
      setResetLoading(false);
    }
  }

  return (   <div className="crm-login-screen">
      <div className="crm-login-shell">
        <aside className="crm-login-brand-panel" aria-hidden="true">
          <img className="crm-login-logo" src="/logo.png" alt="" />
          <p className="crm-login-kicker">Zomorod Medical Supplies</p>
          <h1>CRM Portal</h1>
          <p className="crm-login-copy">
            Manage customers, products, suppliers, and sales from one secure dashboard.
          </p>
        </aside>

        <section className="crm-login-form-panel">
          <img className="crm-login-logo crm-login-logo-mobile" src="/logo.png" alt="Zomorod logo" />
          <h2 className="crm-login-title">Welcome back</h2>
          <p className="crm-login-subtitle">Sign in to continue to your CRM workspace.</p>

          <form onSubmit={onSubmit} className="crm-login-form">
            <label className="crm-login-label" htmlFor="crm-email">
              Email
            </label>
            <input
              id="crm-email"
              className="crm-login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="you@zomorodmedical.com"
              required
            />

            <label className="crm-login-label" htmlFor="crm-password">
              Password
            </label>
            <div className="crm-password-row">
                            <input
                id="crm-password"
                className="crm-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
               <button
                className="crm-btn crm-btn-outline crm-password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="crm-login-row">
              <label className="crm-check crm-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                className="crm-link-btn"
                type="button"
                onClick={onForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "Sending..." : "Forgot password?"}
              </button>
            </div>

            {error ? <div className="crm-error">{error}</div> : null}
            {info ? <div className="crm-info">{info}</div> : null}

            <button className="crm-btn crm-btn-primary crm-login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}