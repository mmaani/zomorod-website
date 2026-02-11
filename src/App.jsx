// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Public site
import MainLayout from "./main/MainLayout.jsx";
import Home from "./main/Home.jsx";
import Products from "./main/Products.jsx";
import Contact from "./main/Contact.jsx";
import Careers from "./main/Careers.jsx";
import Quality from "./main/Quality.jsx";
import Privacy from "./main/Privacy.jsx";
import Terms from "./main/Terms.jsx";

// CRM
import LoginPage from "./crm/LoginPage.jsx";
import CRMLayout from "./crm/CRMLayout.jsx";
import ProtectedRoute from "./crm/ProtectedRoute.jsx";
import DashboardPage from "./crm/pages/DashboardPage.jsx";
import ProductsPage from "./crm/pages/ProductsPage.jsx";
import SuppliersPage from "./crm/pages/SuppliersPage.jsx";
import ClientsPage from "./crm/pages/ClientsPage.jsx";
import SalesPage from "./crm/pages/SalesPage.jsx";
import SalespersonsPage from "./crm/pages/SalespersonsPage.jsx";
import RecruitmentPage from "./crm/pages/RecruitmentPage.jsx";
import UsersPage from "./crm/pages/UsersPage.jsx";

function NotFound() {
  return (
    <main className="site-page">
      <section className="card page-section">
        <h1 className="h2" style={{ margin: 0 }}>404</h1>
        <p className="p">Page not found.</p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public website */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Route>

        {/* Keep /login as an alias (your header uses it) */}
        <Route path="/login" element={<Navigate to="/crm/login" replace />} />

        {/* CRM */}
        <Route path="/crm/login" element={<LoginPage />} />

        <Route
          path="/crm"
          element={
            <ProtectedRoute>
              <CRMLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="salespersons" element={<SalespersonsPage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
