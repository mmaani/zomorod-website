import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MarketingPage from "./marketing/MarketingPage.jsx";
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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />

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

            {/* optional: keep CRM unknown paths inside CRM */}
            <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
