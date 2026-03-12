import { Navigate, useParams, Outlet } from "react-router-dom";
import { isAuthenticated, getUserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { slug } = useParams();
  const isAuth = isAuthenticated();
  const role = getUserRole();

  if (!isAuth) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If they are authenticated but lack permissions, redirect to their proper dashboard
    if (role === "Admin") {
      return <Navigate to={`/${slug}/admin`} replace />;
    } else {
      return <Navigate to={`/${slug}/dashboard`} replace />;
    }
  }

  return <Outlet />;
}
