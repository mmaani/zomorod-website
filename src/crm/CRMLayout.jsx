import { Outlet, useNavigate, Link } from "react-router-dom";
import { clearToken } from "./auth";

export default function CRMLayout() {
  const nav = useNavigate();

  function logout() {
    clearToken();
    nav("/login", { replace: true });
  }

  return (
    <div className="crm page">
      <header className="crm-topbar header">
        <div className="brand" role="button" tabIndex={0} onClick={() => nav("/crm")}>
          <div>
            <h1 className="brand__title">Zomorod CRM</h1>
            <p className="brand__tagline">Inventory • Clients • Sales</p>
          </div>
        </div>

        <div className="header__right">
          <nav className="nav" aria-label="CRM">
            <Link className="nav__link" to="/crm">Dashboard</Link>
            <Link className="nav__link" to="/crm/products">Products</Link>
            <Link className="nav__link" to="/crm/clients">Clients</Link>
            <Link className="nav__link" to="/crm/sales">Sales</Link>
          </nav>

          <button className="button button--ghost" type="button" onClick={logout}>
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
cd /workspaces/zomorod-website
