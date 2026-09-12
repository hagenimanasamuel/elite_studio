import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Backend origin (e.g. http://localhost:3000) — used to resolve /uploads/... paths
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

// Resolve a stored image path ("/uploads/x.jpg" or full URL) to an absolute URL
export const assetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── Auto Token Refresh ──────────────────────────────────────
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.code;
    const status = error.response?.status;
    const isAuthRoute =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/refresh") ||
      original?.url?.includes("/auth/profile");

    // Heals both expired tokens and tokens signed with a rotated secret
    const recoverable =
      (status === 401 && code === "TOKEN_EXPIRED") ||
      (status === 403 && code === "INVALID_TOKEN");

    if (recoverable && !original._retried && !isAuthRoute) {
      original._retried = true;

      try {
        refreshPromise =
          refreshPromise || api.post("/auth/refresh").finally(() => (refreshPromise = null));
        await refreshPromise;
        return api(original);
      } catch {
        // Refresh failed — session is truly over
        window.dispatchEvent(new Event("auth:logout"));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
