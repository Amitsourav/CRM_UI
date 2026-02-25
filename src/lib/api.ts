import axios from "axios";

// On the client side, use relative "/api/v1" so requests go through
// the Next.js rewrite proxy (next.config.ts) and avoid CORS issues.
// On the server side, use the full backend URL directly.
const baseURL =
  typeof window !== "undefined"
    ? "/api/v1"
    : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV === "development") {
      const timing = res.headers["x-response-time"];
      if (timing) {
        const method = res.config.method?.toUpperCase();
        const url = res.config.url;
        console.log(`[API] ${method} ${url} -> ${res.status} in ${timing}`);
      }
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const refreshUrl =
          typeof window !== "undefined"
            ? "/api/v1/auth/refresh"
            : `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`;
        const { data } = await axios.post(refreshUrl, {
          refresh_token: refresh,
        });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        // Only clear tokens if they haven't been refreshed by a concurrent login
        const currentToken = localStorage.getItem("access_token");
        const failedToken = original.headers?.Authorization?.replace("Bearer ", "");
        if (!currentToken || currentToken === failedToken) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
