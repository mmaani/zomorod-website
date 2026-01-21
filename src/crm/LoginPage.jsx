import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      nav("/crm", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    }
  }

  return (
    <div className="page">
      <main className="main">
        <section className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
          <div className="card__label">Zomorod CRM</div>
          <h2 style={{ marginTop: 6, marginBottom: 12 }}>Login</h2>

          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p style={{ color: "crimson", marginTop: 6 }}>{error}</p>}

            <button className="button button--primary" type="submit" style={{ marginTop: 12, width: "100%" }}>
              Sign in
            </button>
          </form>

          <p className="note" style={{ marginTop: 12 }}>
            Step 1: placeholder login. Step 2 adds real authentication + roles.
          </p>
        </section>
      </main>
    </div>
  );
}
