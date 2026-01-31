import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "./auth.js";

/**
 * Protects CRM routes.
 * If not logged in, redirect to /crm/login and remember where user came from.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/crm/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
