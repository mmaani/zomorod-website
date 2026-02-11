// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ===== Public site (main) ===== */
import MainLayout from "./main/MainLayout.jsx";
import Home from "./main/Home.jsx";
import Products from "./main/Products.jsx";
import Quality from "./main/Quality.jsx";
import Careers from "./main/Careers.jsx";
import Contact from "./main/Contact.jsx";
import Privacy from "./main/Privacy.jsx";
import Terms from "./main/Terms.jsx";

/* ===== CRM ===== */
import CRMLayout from "./crm/CRMLayout.jsx";
import LoginPage from "./crm/LoginPage.jsx";
import ProtectedRoute from "./crm/ProtectedRoute.jsx";

// ✅ Lazy-load CRM pages to reduce main bundle size
const DashboardPage = lazy(() => import("./crm/pages/DashboardPage.jsx"));
const ProductsPage = lazy(() => import("./crm/pages/ProductsPage.jsx"));
const ClientsPage = lazy(() => import("./crm/pages/ClientsPage.jsx"));
const SalesPage = lazy(() => import("./crm/pages/SalesPage.jsx"));
const SuppliersPage = lazy(() => import("./crm/pages/SuppliersPage.jsx"));
const SalespersonsPage = lazy(() => import("./crm/pages/SalespersonsPage.jsx"));
const UsersPage = lazy(() => import("./crm/pages/UsersPage.jsx"));
const RecruitmentPage = lazy(() => import("./crm/pages/RecruitmentPage.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
        <Routes>
          {/* Public site */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="quality" element={<Quality />} />
            <Route path="careers" element={<Careers />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
          </Route>

          {/* Backward-compat (old marketing path if it existed) */}
          <Route path="/marketing" element={<Navigate to="/" replace />} />

          {/* keep old login working */}
          <Route path="/login" element={<Navigate to="/crm/login" replace />} />
          <Route path="/crm/login" element={<LoginPage />} />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <CRMLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/crm/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="salespersons" element={<SalespersonsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="recruitment" element={<RecruitmentPage />} />
            <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
