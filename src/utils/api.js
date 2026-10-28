// VITE_API_URL should include the version prefix, e.g. http://localhost:5000/api/v1
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const LOGIN_PATH = "/";

// Same lookup order your AssistantGate uses
export const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

export const clearToken = () => {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");
};

export const authHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};