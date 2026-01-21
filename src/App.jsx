// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MarketingPage from "./marketing/MarketingPage.jsx";

import LoginPage from "./crm/LoginPage.jsx";
import CRMLayout from "./crm/CRMLayout.jsx";
import ProtectedRoute from "./crm/ProtectedRoute.jsx";

import DashboardPage from "./crm/pages/DashboardPage.jsx";
import ProductsPage from "./crm/pages/ProductsPage.jsx";
import ClientsPage from "./crm/pages/ClientsPage.jsx";
import SalesPage from "./crm/pages/SalesPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing site */}
        <Route path="/" element={<MarketingPage />} />

        {/* CRM auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* CRM (protected) */}
        <Route
          path="/crm"
          element={
            <ProtectedRoute>
              <CRMLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="sales" element={<SalesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
