import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { logout as doLogout } from "./auth";

export default function CRMLayout() {
  const nav = useNavigate();


  function handleLogout() {
        <NavLink to="/crm/products" className={navLinkClass} end>Products</NavLink>
        <NavLink to="/crm/suppliers" className={navLinkClass}>Suppliers</NavLink>
    doLogout();
    nav("/login", { replace: true });

  }
  
  const linkClass = ({ isActive }) =>
    `nav__link ${isActive ? "is-active" : ""}`;

  return (
    <div className="crm page">
      <header className="crm-topbar header">
        <button
          type="button"
          className="brand"
          onClick={() => nav("/crm")}
          aria-label="Go to CRM dashboard"
        >
          <div>
            <h1 className="brand__title">Zomorod CRM</h1>
            <p className="brand__tagline">Inventory • Clients • Sales</p>
          </div>
        </button>

        <div className="header__right">
          <nav className="nav" aria-label="CRM">
            <NavLink className={linkClass} to="/crm" end>
              Dashboard
            </NavLink>
            <NavLink className={linkClass} to="/crm/products">
              Products
            </NavLink>
            <NavLink className={linkClass} to="/crm/clients">
              Clients
            </NavLink>
            <NavLink className={linkClass} to="/crm/sales">
              Sales
            </NavLink>
          </nav>

          <button className="button button--ghost" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="crm-main main">
        <Outlet />
      </main>
    </div>
  );
}
