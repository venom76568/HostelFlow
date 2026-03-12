export interface TokenPayload {
  uid: string;
  role: string;
  tenant_id: string;
  exp: number;
}

export const getAuthToken = () => localStorage.getItem("token");

export const setAuthToken = (token: string) => localStorage.setItem("token", token);

export const removeAuthToken = () => localStorage.removeItem("token");

export const parseJwt = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const isAuthenticated = () => {
    const token = getAuthToken();
    if (!token) return false;
    const decoded = parseJwt(token);
    if (!decoded) return false;
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
        removeAuthToken();
        return false;
    }
    return true;
};

export const getUserRole = () => {
    const token = getAuthToken();
    if (!token) return null;
    const decoded = parseJwt(token);
    return decoded?.role || null;
};
