import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth.js";

function StatCard({ label, value, hint }) {
  return (
    <div className="crm-card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
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
        // Products
        const pr = await apiFetch("/api/products");
        if (!pr) return;
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok || !pj.ok) throw new Error(pj.error || `Products HTTP ${pr.status}`);
        const products = Array.isArray(pj.products) ? pj.products : [];

        // Suppliers
        let suppliers = [];
        const sr = await apiFetch("/api/suppliers");
        if (sr) {
          const sj = await sr.json().catch(() => ({}));
          if (sr.ok && sj.ok) suppliers = sj.suppliers || [];
        }

        // Clients
        let clients = [];
        const cr = await apiFetch("/api/clients");
        if (cr) {
          const cj = await cr.json().catch(() => ({}));
          if (cr.ok && cj.ok) clients = cj.clients || [];
        }

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
    return () => {
      alive = false;
    };
  }, []);

  const roleLabel = user?.roles?.length ? user.roles.join(", ") : "-";

  return (
    <div className="crm-wrap">
      <div className="crm-card">
        <div className="dash-head">
          <div>
            <h2 className="dash-title">
              Welcome back{user?.fullName ? `, ${user.fullName}` : ""} 👋
            </h2>
            <div className="dash-sub">
              Signed in as <b>{user?.email || "-"}</b> • Role: <b>{roleLabel}</b>
            </div>
          </div>

          <div className="z-badges" aria-label="Brand badges">
            <span className="z-badge z-badge-strong">ZOMOROD</span>
            <span className="z-badge z-badge-soft">CRM</span>
          </div>
        </div>

        <div className="dash-note">
          <b>Zomorod Medical Supplies</b> — Inventory, Suppliers, Clients, and Sales tracking.
          {isMain ? " You have admin access." : " Limited access mode."}
        </div>

        {err ? <div className="banner">{err}</div> : null}
        {loading ? <div className="muted" style={{ marginTop: 10 }}>Loading dashboard…</div> : null}
      </div>

      <div className="dash-grid">
        <StatCard label="Products" value={stats.products} hint="Active products in system" />
        <StatCard label="Suppliers" value={stats.suppliers} hint="Supplier directory" />
        <StatCard label="Clients" value={stats.clients} hint="Customer accounts" />
        <StatCard label="On-Hand Units" value={stats.onHandTotal} hint="Total stock across products" />
      </div>

      <div className="crm-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Next steps</h3>
        <ul className="dash-actions">
          <li><b>Products</b>: add SKUs and receive batches.</li>
          <li><b>Suppliers</b>: maintain supplier contacts for purchasing.</li>
          <li><b>Clients</b>: manage customer profiles for sales.</li>
          <li><b>Sales</b>: record invoices and reduce stock (we’ll build this next).</li>
        </ul>
      </div>
    </div>
  );
}
