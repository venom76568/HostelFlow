export interface TokenPayload {
  uid: string;
  role: string;
  tenant_id: string;
  exp: number;
}

export const getAuthToken = () => localStorage.getItem("token");
export const setAuthToken = (token: string) => localStorage.setItem("token", token);
export const removeAuthToken = () => localStorage.removeItem("token");

export const getUserRole = () => localStorage.getItem("role");
export const setUserRole = (role: string) => localStorage.setItem("role", role);
export const removeUserRole = () => localStorage.removeItem("role");

export const getCollegeSlug = () => localStorage.getItem("college_slug");
export const setCollegeSlug = (slug: string) => localStorage.setItem("college_slug", slug);
export const removeCollegeSlug = () => localStorage.removeItem("college_slug");

/** Wipes all stored session data (token, role, college_slug) */
export const clearSession = () => {
  removeAuthToken();
  removeUserRole();
  removeCollegeSlug();
};

export const parseJwt = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Returns true if the JWT is present and not expired.
 * If the token is expired or invalid, wipes ALL session data so there are no dead links.
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  const decoded = parseJwt(token);
  if (!decoded) {
    clearSession();
    return false;
  }
  if (decoded.exp * 1000 < Date.now()) {
    clearSession();
    return false;
  }
  return true;
};
