import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getUserRole, getCollegeSlug } from "@/lib/auth";

/**
 * AuthRedirector — "Traffic Controller"
 *
 * Runs on the root "/" route before showing any page.
 * Reads the stored session and redirects in < 1 frame:
 *   Admin   → /:college_slug/admin
 *   Student → /:college_slug/dashboard
 *   None    → /login
 */
export default function AuthRedirector({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const authed = isAuthenticated();
    setIsAuth(authed);
    
    if (!authed) {
      setIsChecking(false);
      return;
    }

    const role = getUserRole();
    const slug = getCollegeSlug();

    if (!slug) {
      setIsChecking(false);
      return;
    }

    if (role === "Admin") {
      navigate(`/${slug}/admin`, { replace: true });
    } else if (role === "Student") {
      navigate(`/${slug}/dashboard`, { replace: true });
    } else if (role === "SuperAdmin") {
      navigate("/super-panel", { replace: true });
    } else {
      setIsChecking(false);
    }
  }, [navigate]);

  if (isChecking && isAuth) return null;
  return <>{children}</>;
}
