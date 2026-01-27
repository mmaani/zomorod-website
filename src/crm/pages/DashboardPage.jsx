import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth.js";

function StatCard({ label, value, hint }) {
  return (
    <div className="crm-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

function QuickCard({ title, desc, cta, onClick }) {
  return (
    <div className="crm-card quick-card">
      <h4>{title}</h4>
      <p>{desc}</p>
      <button className="crm-btn crm-btn-primary" onClick={onClick}>{cta}</button>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const user = getUser();
  const isMain = hasRole("main");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stats, setStats] = useState({
    products: 0,
    suppliers: 0,
    clients: 0,
    onHandTotal: 0,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const pr = await apiFetch("/api/products");
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok || !pj.ok) throw new Error(pj.error || `Products HTTP ${pr.status}`);
        const products = Array.isArray(pj.products) ? pj.products : [];

        const sr = await apiFetch("/api/suppliers");
        const sj = await sr.json().catch(() => ({}));
        const suppliers = sr.ok && sj.ok ? (sj.suppliers || []) : [];

        const cr = await apiFetch("/api/clients");
        const cj = await cr.json().catch(() => ({}));
        const clients = cr.ok && cj.ok ? (cj.clients || []) : [];

        const onHandTotal = products.reduce((sum, p) => sum + (Number(p.onHandQty) || 0), 0);

        if (!alive) return;
        setStats({
          products: products.length,
          suppliers: suppliers.length,
          clients: clients.length,
          onHandTotal,
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="crm-card">
        <div className="dash-hero">
          <div>
            <h2 className="dash-title">
              Welcome back{user?.fullName ? `, ${user.fullName}` : ""} 👋
            </h2>
            <div className="dash-sub">
              You’re logged in as <b>{user?.email || "-"}</b>
              {user?.roles?.length ? (
                <>
                  {" "} • Roles: <b>{user.roles.join(", ")}</b>
                </>
              ) : null}
              <br />
              {isMain
                ? "You have admin access. You can manage products, suppliers, clients, and record sales."
                : "You have limited access based on your role."}
            </div>
          </div>

          <div className="badges">
            <span className="badge badge-strong">ZOMOROD</span>
            <span className="badge badge-soft">CRM</span>
          </div>
        </div>

        {err ? <div className="banner">{err}</div> : null}
        {loading ? <div className="muted" style={{ marginTop: 8 }}>Loading dashboard…</div> : null}
      </div>

      <div className="dash-grid">
        <StatCard label="Products" value={stats.products} hint="Total products in your catalog" />
        <StatCard label="Suppliers" value={stats.suppliers} hint="Saved supplier profiles" />
        <StatCard label="Clients" value={stats.clients} hint="Customer accounts & buyers" />
        <StatCard label="Total On-Hand Units" value={stats.onHandTotal} hint="Sum of inventory across products" />
      </div>

      <div className="quick-grid">
        <QuickCard
          title="Add / Receive Stock"
          desc="Create SKUs and receive batches into inventory."
          cta="Go to Products"
          onClick={() => nav("/crm/products")}
        />
        <QuickCard
          title="Manage Suppliers"
          desc="Maintain supplier directory and contact details."
          cta="Go to Suppliers"
          onClick={() => nav("/crm/suppliers")}
        />
        <QuickCard
          title="Manage Clients"
          desc="Add buyers and keep customer contact records."
          cta="Go to Clients"
          onClick={() => nav("/crm/clients")}
        />
        <QuickCard
          title="Record Sales"
          desc="Create invoices and automatically reduce stock."
          cta="Go to Sales"
          onClick={() => nav("/crm/sales")}
        />
      </div>
    </div>
  );
}
