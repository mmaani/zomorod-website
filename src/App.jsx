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

export default function App() {
  return (
    <BrowserRouter>
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

          {/* optional: keep CRM unknown paths inside CRM */}
          <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
