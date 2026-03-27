import { Navigate, useParams, Outlet } from "react-router-dom";
import { isAuthenticated, getUserRole, clearSession } from "@/lib/auth";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { slug } = useParams();
  const isAuth = isAuthenticated(); // also wipes session if JWT expired
  const role = getUserRole();

  if (!isAuth) {
    // Ensure all session data is clean before sending to login
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Authenticated but wrong role — redirect to their actual workspace
    if (role === "Admin") {
      return <Navigate to={`/${slug}/admin`} replace />;
    } else {
      return <Navigate to={`/${slug}/dashboard`} replace />;
    }
  }

  return <Outlet />;
}
