import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout as doLogout, getUser, hasRole } from "./auth.js";
import "./crm.css";

export default function CRMLayout() {
  const nav = useNavigate();
  const user = getUser();
  const isMain = hasRole("main");

  function handleLogout() {
    doLogout();
    nav("/crm/login", { replace: true });
  }

  const navLinkClass = ({ isActive }) =>
    "crm-nav-link" + (isActive ? " active" : "");

  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-inner">
          <div className="crm-brand" onClick={() => nav("/crm/dashboard")}>
            {/* Use your logo mark here. Put it in /public for easiest use */}
            <img className="crm-brand-mark" src="/favicon.ico" alt="Zomorod" />
            <div className="crm-brand-text">
              <strong>ZOMOROD CRM</strong>
              <span>Medical Supplies</span>
            </div>
          </div>

          <nav className="crm-nav">
            <NavLink to="/crm/dashboard" className={navLinkClass} end>Dashboard</NavLink>
            <NavLink to="/crm/products" className={navLinkClass}>Products</NavLink>
            <NavLink to="/crm/suppliers" className={navLinkClass}>Suppliers</NavLink>
            <NavLink to="/crm/clients" className={navLinkClass}>Clients</NavLink>
            <NavLink to="/crm/sales" className={navLinkClass}>Sales</NavLink>
            {isMain ? <NavLink to="/crm/recruitment" className={navLinkClass}>Recruitment</NavLink> : null}
            {isMain ? <NavLink to="/crm/users" className={navLinkClass}>Users</NavLink> : null}
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
