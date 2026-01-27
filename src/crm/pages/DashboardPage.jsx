import React from "react";
import { apiFetch } from "../api.js";
import { getUser } from "../auth.js";
import "../crm.css";

function StatCard({ title, value, hint }) {
  return (
    <div className="crm-card" style={{ padding: 16 }}>
      <div className="crm-muted" style={{ fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.2 }}>{value}</div>
      {hint ? <div className="crm-muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const user = getUser();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState({
    products: 0,
    suppliers: 0,
    clients: 0,
    sales: 0,
  });

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        // We intentionally compute stats using existing endpoints to avoid adding new serverless functions.
        const [pRes, sRes, cRes, saRes] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/suppliers"),
          apiFetch("/clients"),
          apiFetch("/sales"),
        ]);

        const pJson = pRes?.ok ? await pRes.json() : { ok: false };
        const sJson = sRes?.ok ? await sRes.json() : { ok: false };
        const cJson = cRes?.ok ? await cRes.json() : { ok: false };
        const saJson = saRes?.ok ? await saRes.json() : { ok: false };

        if (!mounted) return;

        setStats({
          products: Array.isArray(pJson.products) ? pJson.products.length : 0,
          suppliers: Array.isArray(sJson.suppliers) ? sJson.suppliers.length : 0,
          clients: Array.isArray(cJson.clients) ? cJson.clients.length : 0,
          sales: Array.isArray(saJson.sales) ? saJson.sales.length : 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const fullName = user?.fullName || "Welcome";
  const roles = Array.isArray(user?.roles) ? user.roles.join(", ") : "";

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div className="crm-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          {fullName} 👋
        </div>
        <div className="crm-muted" style={{ marginTop: 6 }}>
          {user?.email ? <>Signed in as <b>{user.email}</b></> : null}
          {roles ? <> · Role: <b>{roles}</b></> : null}
        </div>
        <div className="crm-muted" style={{ marginTop: 10 }}>
          ZOMOROD CRM helps you manage inventory (products + lots), suppliers, clients, and sales in one place.
        </div>
      </div>

      {error ? (
        <div className="crm-card" style={{ padding: 14, borderColor: "rgba(239,68,68,0.35)" }}>
          <b>Dashboard error:</b> <span className="crm-muted">{error}</span>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <StatCard title="Products" value={loading ? "…" : stats.products} />
        <StatCard title="Suppliers" value={loading ? "…" : stats.suppliers} />
        <StatCard title="Clients" value={loading ? "…" : stats.clients} />
        <StatCard title="Sales" value={loading ? "…" : stats.sales} hint="Records count (MVP)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
        <div className="crm-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Quick Actions</div>
          <div className="crm-muted" style={{ marginBottom: 12 }}>Jump straight to common tasks.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="crm-btn-outline" href="/crm/products">Manage Products</a>
            <a className="crm-btn-outline" href="/crm/suppliers">Manage Suppliers</a>
            <a className="crm-btn-outline" href="/crm/clients">Manage Clients</a>
            <a className="crm-btn-outline" href="/crm/sales">Record Sales</a>
          </div>
        </div>

        <div className="crm-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Identity & Compliance</div>
          <div className="crm-muted">
            Operating: Jordan (primary) · Expansion: Syria (planned)
            <br />
            Currency: JOD · Lot tracking enabled · Role-based access
          </div>
        </div>
      </div>
    </div>
  );
}
