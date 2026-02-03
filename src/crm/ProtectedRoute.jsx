import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "./auth.js";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    const from = location.pathname + location.search + location.hash;

    // Avoid saving the login page itself (prevents loops)
    const safeFrom = from.startsWith("/crm/login") ? "/crm/dashboard" : from;

    return <Navigate to="/crm/login" replace state={{ from: safeFrom }} />;
  }

  return children;
}
