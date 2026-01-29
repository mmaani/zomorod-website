import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MarketingPage from "./marketing/MarketingPage.jsx";
import CRMLayout from "./crm/CRMLayout.jsx";
import LoginPage from "./crm/LoginPage.jsx";
import ProtectedRoute from "./crm/ProtectedRoute.jsx";
import DashboardPage from "./crm/pages/DashboardPage.jsx";
import ProductsPage from "./crm/pages/ProductsPage.jsx";
import ClientsPage from "./crm/pages/ClientsPage.jsx";
import SalesPage from "./crm/pages/SalesPage.jsx";
import SuppliersPage from "./crm/pages/SuppliersPage.jsx";
import SalespersonsPage from "./crm/pages/SalespersonsPage.jsx";

/*
 * Top‑level app router.  Defines both the marketing site and the
 * protected CRM routes.  The suppliers route was previously
 * commented out despite the navigation link existing in the CRM
 * layout.  This update imports the SuppliersPage component and
 * enables the route so users can manage suppliers from the CRM.
 */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing site */}
        <Route path="/" element={<MarketingPage />} />

        {/* IMPORTANT: redirect old login to CRM login */}
        <Route path="/login" element={<Navigate to="/crm/login" replace />} />

        {/* CRM auth */}
        <Route path="/crm/login" element={<LoginPage />} />

        {/* CRM protected routes */}
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

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}