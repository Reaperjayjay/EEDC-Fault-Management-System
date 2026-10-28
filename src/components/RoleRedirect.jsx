
import { Navigate } from "react-router-dom";

export function RoleRedirect() {
  const role =
    sessionStorage.getItem("role") ||
    localStorage.getItem("role");

  if (role === "admin" || role === "operator") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === "engineer") {
    return <Navigate to="/engineer/dashboard" replace />;
  }

  if (role === "user") {
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}

export function ProtectedRoute({ allowedRoles, children }) {
  const role =
    sessionStorage.getItem("role") ||
    localStorage.getItem("role");

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
