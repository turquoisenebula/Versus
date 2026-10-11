import api from "./axios";

export async function register(credentials) {
  const response = await api.post("/auth/register", credentials);
  return response.data;
}

export async function login(credentials) {
  const response = await api.post("/auth/login", credentials);
  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}
