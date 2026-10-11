import api from "./axios";

export async function getProfile(username, config = {}) {
  const response = await api.get(
    `/users/${encodeURIComponent(username)}`,
    config,
  );
  return response.data;
}

export async function getUserDebates(username, params = {}, config = {}) {
  const response = await api.get(
    `/users/${encodeURIComponent(username)}/debates`,
    { ...config, params },
  );
  return response.data;
}

export async function updateMyProfile({ bio, avatar }) {
  const response = await api.put("/users/me", { bio, avatar });
  return response.data;
}
