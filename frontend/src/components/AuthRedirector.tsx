import { useEffect } from "react";
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
export default function AuthRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    const role = getUserRole();
    const slug = getCollegeSlug();

    if (!slug) {
      // Session exists but college_slug is missing (very rare edge-case) — send to login
      navigate("/login", { replace: true });
      return;
    }

    if (role === "Admin") {
      navigate(`/${slug}/admin`, { replace: true });
    } else if (role === "Student") {
      navigate(`/${slug}/dashboard`, { replace: true });
    } else if (role === "SuperAdmin") {
      navigate("/super-panel", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Render nothing — this component exists purely for side-effect navigation
  return null;
}
