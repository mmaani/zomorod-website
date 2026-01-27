import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout as doLogout, getUser } from "./auth.js";
import "./crm.css";

export default function CRMLayout() {
  const nav = useNavigate();
  const user = getUser();

  function handleLogout() {
    doLogout();
    nav("/crm/login", { replace: true });
  }

  const navLinkClass = ({ isActive }) => "crm-nav-link" + (isActive ? " active" : "");

  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-inner">
          <div className="crm-brand" onClick={() => nav("/crm/dashboard")} title="Go to Dashboard">
            {/* Put your logo in /public as /zomorod-mark.png (or change src below) */}
            <img className="crm-brand-mark" src="/zomorod-mark.png" alt="Zomorod" />
            <div className="crm-brand-text">
              <strong>ZOMOROD CRM</strong>
              <span>Medical Supplies • Inventory & Sales</span>
            </div>
          </div>

          <nav className="crm-nav">
            <NavLink to="/crm/dashboard" className={navLinkClass} end>Dashboard</NavLink>
            <NavLink to="/crm/products" className={navLinkClass}>Products</NavLink>
            <NavLink to="/crm/suppliers" className={navLinkClass}>Suppliers</NavLink>
            <NavLink to="/crm/clients" className={navLinkClass}>Clients</NavLink>
            <NavLink to="/crm/sales" className={navLinkClass}>Sales</NavLink>
          </nav>

          <div className="crm-user">
            <span className="crm-user-email">{user?.email || ""}</span>
            <button className="crm-btn crm-btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="crm-content">
        <Outlet />
      </main>
    </div>
  );
}
