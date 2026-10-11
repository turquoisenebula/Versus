import axios from "axios";

export const AUTH_TOKEN_KEY = "versus_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = new URL(
        error.config?.url ?? "",
        error.config?.baseURL ?? window.location.origin,
      );
      const pathname = requestUrl.pathname.replace(/\/+$/, "");
      const isLoginOrRegistration = ["/auth/login", "/auth/register"].some(
        (endpoint) => pathname.endsWith(endpoint),
      );

      if (!isLoginOrRegistration) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.dispatchEvent(new Event("auth:logout"));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
