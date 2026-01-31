import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, isLoggedIn, getRememberFlag } from "./auth.js";
import "./crm.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Default rememberMe from stored preference (safe in our new auth.js)
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return getRememberFlag();
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Where to go after login
  const from = location.state?.from || "/crm/dashboard";

  React.useEffect(() => {
    if (isLoggedIn()) {
      navigate(from, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // keep it stable; from might be undefined on first render in some cases

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate(from, { replace: true });
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
