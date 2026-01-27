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
        const pr = await apiFetch("/products");
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok || !pj.ok) throw new Error(pj.error || `Products HTTP ${pr.status}`);
        const products = Array.isArray(pj.products) ? pj.products : [];

        // Suppliers
        let suppliers = [];
        const sr = await apiFetch("/suppliers");
        const sj = await sr.json().catch(() => ({}));
        if (sr.ok && sj.ok) suppliers = sj.suppliers || [];

        // Clients
        let clients = [];
        const cr = await apiFetch("/clients");
        const cj = await cr.json().catch(() => ({}));
        if (cr.ok && cj.ok) clients = cj.clients || [];

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

  return (
    <div className="crm-wrap">
      <div className="crm-card">
        <div className="dash-head">
          <div>
            <h2 className="dash-title">Welcome back{user?.fullName ? `, ${user.fullName}` : ""} 👋</h2>
            <div className="dash-sub">
              You are logged in as <b>{user?.email || "-"}</b>
              {user?.roles?.length ? (
                <>
                  {" "}
                  • Roles: <b>{user.roles.join(", ")}</b>
                </>
              ) : null}
            </div>
          </div>
          <div className="dash-brand-badge">
            <span className="badge-strong">ZOMOROD</span>
            <span className="badge-soft">CRM</span>
          </div>
        </div>

        <div className="dash-note">
          <b>Zomorod Medical Supplies</b> • Inventory, Suppliers, Clients, and Sales tracking.
          {isMain ? " You have admin access." : " Limited access mode."}
        </div>

        {err ? <div className="banner">{err}</div> : null}
        {loading ? <div className="muted">Loading dashboard…</div> : null}
      </div>

      <div className="dash-grid">
        <StatCard label="Products" value={stats.products} hint="Active/archived based on view" />
        <StatCard label="Suppliers" value={stats.suppliers} hint="Saved supplier profiles" />
        <StatCard label="Clients" value={stats.clients} hint="Accounts & buyers" />
        <StatCard label="Total On-Hand Units" value={stats.onHandTotal} hint="Sum of on-hand quantity across products" />
      </div>

      <div className="crm-card">
        <h3 style={{ marginTop: 0 }}>Quick actions</h3>
        <ul className="dash-actions">
          <li>Go to <b>Products</b> to add SKUs and receive batches.</li>
          <li>Go to <b>Suppliers</b> to maintain your supplier directory.</li>
          <li>Go to <b>Clients</b> to manage customer profiles.</li>
          <li>Go to <b>Sales</b> to record invoices and reduce stock (next step).</li>
        </ul>
      </div>
    </div>
  );
}
