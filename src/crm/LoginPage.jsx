import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, isLoggedIn, getRememberFlag } from "./auth.js";
import "./crm.css";

function normalizePath(p) {
  if (!p) return null;
  const s = String(p);
  if (!s) return null;
  return s.startsWith("/") ? s : `/${s}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return getRememberFlag();
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = useMemo(() => {
    const fallback = "/crm/dashboard";
    const raw = location.state?.from;

    // from as string
    if (typeof raw === "string") {
      const p = normalizePath(raw);
      if (p && p !== "/crm/login") return p;
      return fallback;
    }

    // from as location-like object
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

  return (
    <div className="crm-container">
      <div className="crm-card">
        <h1 className="crm-title">ZOMOROD CRM Login</h1>

        <form onSubmit={onSubmit} className="crm-form">
          <label className="crm-label">Email</label>
          <input
            className="crm-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            required
          />

          <label className="crm-label">Password</label>
          <input
            className="crm-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />

          <div className="crm-remember">
            <label className="crm-check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
          </div>

          {error ? <div className="crm-error">{error}</div> : null}

          <button className="crm-btn crm-btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
