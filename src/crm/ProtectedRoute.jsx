import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "./auth.js";

/**
 * Protects CRM routes.
 * If user is not logged in, redirect to /crm/login
 * and remember the original location (pathname + search + hash).
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  // NOTE: Keep auth check synchronous (localStorage/cookie-based).
  // If you need async token validation, do it before rendering routes.
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/crm/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}
