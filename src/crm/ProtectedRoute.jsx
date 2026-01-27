import React from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "./auth.js";

/*
 * A small wrapper component that protects CRM routes.  It checks
 * whether the user is logged in (i.e. a token exists in
 * localStorage) and if not, redirects them to the CRM login page.  The
 * previous implementation redirected to `/login`, which was unused; the
 * correct path is `/crm/login`.
 */

export default function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/crm/login" replace />;
  return children;
}