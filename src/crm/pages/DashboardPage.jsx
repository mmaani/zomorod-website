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
      <button className="crm-btn crm-btn-primary" onClick={onClick}>
        {cta}
      </button>
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
    salespersons: 0,
    onHandTotal: 0,
    availableJobs: 0,
    applicants: 0,
  });

  const [envStatus, setEnvStatus] = useState(null);
  const [envErr, setEnvErr] = useState("");
  const [emailTestState, setEmailTestState] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        // ✅ apiFetch already prefixes /api, so DO NOT use /api/...
        const pr = await apiFetch("/products");
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok || !pj.ok) throw new Error(pj.error || `Products HTTP ${pr.status}`);
        const products = Array.isArray(pj.products) ? pj.products : [];

        const sr = await apiFetch("/suppliers");
        const sj = await sr.json().catch(() => ({}));
        const suppliers = sr.ok && sj.ok ? sj.suppliers || [] : [];

        const cr = await apiFetch("/clients");
        const cj = await cr.json().catch(() => ({}));
        const clients = cr.ok && cj.ok ? cj.clients || [] : [];

        let salespersons = [];
        try {
          const spr = await apiFetch("/salespersons");
          const spj = await spr.json().catch(() => ({}));
          if (spr.ok && spj.ok) salespersons = spj.salespersons || [];
        } catch {
          salespersons = [];
        }

        const onHandTotal = products.reduce((sum, p) => {
          const v =
            p?.onHandQty ??
            p?.on_hand_qty ??
            p?.onHand ??
            p?.qty_on_hand ??
            p?.qtyOnHand ??
            0;
          return sum + (Number(v) || 0);
        }, 0);
                let availableJobs = 0;
        try {
          const jobsRes = await apiFetch(`/recruitment?resource=${isMain ? "jobs_admin" : "jobs"}`);
          const jobsData = await jobsRes.json().catch(() => ({}));
          if (jobsRes.ok && jobsData.ok) {
            const jobs = Array.isArray(jobsData.jobs) ? jobsData.jobs : [];
            availableJobs = isMain ? jobs.filter((j) => j?.is_published).length : jobs.length;
          }
        } catch {
          availableJobs = 0;
        }

        let applicants = 0;
        if (isMain) {
          try {
            const appsRes = await apiFetch("/recruitment?resource=applications");
            const appsData = await appsRes.json().catch(() => ({}));
            if (appsRes.ok && appsData.ok) {
              const rows = Array.isArray(appsData.applications) ? appsData.applications : [];
              applicants = rows.length;
            }
          } catch {
            applicants = 0;
          }
        }

        if (!alive) return;

        setStats({
          products: products.length,
          suppliers: suppliers.length,
          clients: clients.length,
          salespersons: Array.isArray(salespersons) ? salespersons.length : 0,
          onHandTotal,
          availableJobs,
          applicants,
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

  async function sendTestEmail() {
    setEmailTestState("Sending test email...");
    try {
      const res = await apiFetch("/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          email: "test@email.com",
          message: "Hello from Zomorod CRM",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setEmailTestState("Test email sent. Check inbox: info@zomorodmedical.com");
    } catch (e) {
      setEmailTestState(`Test failed: ${e?.message || "Unknown error"}`);
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadEnvStatus() {
      setEnvErr("");
      try {
        const res = await apiFetch("/secure-env");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Env check HTTP ${res.status}`);
        }
        if (alive) setEnvStatus(data.env || null);
      } catch (e) {
        if (alive) setEnvErr(e?.message || "Failed to load system status");
      }
    }

    loadEnvStatus();
    return () => {
      alive = false;
    };
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
                  {" "}
                  • Roles: <b>{user.roles.join(", ")}</b>
                </>
              ) : null}
              <br />
              {isMain
                ? "You have admin access. You can manage products, suppliers, clients, and record sales."
                : "You have limited access based on your role."}
            </div>
          </div>

          <div className="badges">
          <a href="https://www.zomorodmedical.com">
            <span className="badge badge-strong">ZOMOROD Main Website</span>
          </a>
            <span className="badge badge-soft">CRM</span>
          </div>
        </div>

        {err ? <div className="banner">{err}</div> : null}
        {loading ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Loading dashboard…
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <StatCard label="Products" value={stats.products} hint="Total products in your catalog" />
        <StatCard label="Suppliers" value={stats.suppliers} hint="Saved supplier profiles" />
        <StatCard label="Clients" value={stats.clients} hint="Customer accounts & buyers" />
        <StatCard label="Salespersons" value={stats.salespersons} hint="People who can be assigned to sales" />
        <StatCard label="Total On-Hand Units" value={stats.onHandTotal} hint="Sum of inventory across products" />
        <StatCard label="Available Jobs" value={stats.availableJobs} hint="Currently published vacancies" />
        <StatCard label="Applicants" value={stats.applicants} hint={isMain ? "Total received applications" : "Visible to main admin"} />
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

        {isMain ? (
          <QuickCard
            title="Manage Salespersons"
            desc="Add and manage sales staff / external salespersons."
            cta="Go to Salespersons"
            onClick={() => nav("/crm/salespersons")}
          />
        ) : null}
      </div>

      <div className="crm-card">
        <div className="stat-label">System Status</div>
        {envErr ? <div className="banner">{envErr}</div> : null}
        {!envErr && !envStatus ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Checking server environment…
          </div>
        ) : null}
        {envStatus ? (
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <div>
              Database: <b>{envStatus.database ? "OK" : "Missing"}</b>
            </div>
            <div>
              JWT Secret: <b>{envStatus.jwtSecret ? "OK" : "Missing"}</b>
            </div>
            <div>
              Google Service Account: <b>{envStatus.googleServiceAccount ? "OK" : "Missing"}</b>
            </div>
            <div>
              Google OAuth: <b>{envStatus.googleOauth ? "OK" : "Missing"}</b>
            </div>
          </div>
        ) : null}
      </div>

      {isMain ? (
        <div className="crm-card">
          <div className="stat-label">Email Test</div>
          <button className="crm-btn crm-btn-primary" type="button" onClick={sendTestEmail}>
            Send Test Email
          </button>
          {emailTestState ? (
            <div className="muted" style={{ marginTop: 8 }}>
              {emailTestState}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
