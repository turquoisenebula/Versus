import api from "./axios";

export async function createDebate(body) {
  const response = await api.post("/debates", body);
  return response.data;
}

export async function listDebates(params = {}, config = {}) {
  const response = await api.get("/debates", { ...config, params });
  return response.data;
}

export async function getDebate(id, config = {}) {
  const response = await api.get(`/debates/${encodeURIComponent(id)}`, config);
  return response.data;
}

export async function listArguments(id, params = {}, config = {}) {
  const response = await api.get(
    `/debates/${encodeURIComponent(id)}/arguments`,
    { ...config, params },
  );
  return response.data;
}

export async function postArgument(id, body) {
  const response = await api.post(
    `/debates/${encodeURIComponent(id)}/arguments`,
    body,
  );
  return response.data;
}

export async function castVote(id, choice) {
  const response = await api.put(`/debates/${encodeURIComponent(id)}/vote`, {
    choice,
  });
  return response.data;
}

export async function removeVote(id) {
  const response = await api.delete(`/debates/${encodeURIComponent(id)}/vote`);
  return response.data;
}

export async function toggleUpvote(argumentId) {
  const response = await api.post(
    `/arguments/${encodeURIComponent(argumentId)}/upvote`,
  );
  return response.data;
}
