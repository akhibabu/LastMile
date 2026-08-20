import axios from "axios";
import { ApiClientError, toUserMessage } from "./errors";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lastmile_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new ApiClientError("Cannot reach the API. Start the backend and use the Vite URL shown in the terminal."),
      );
    }
    const payload = error.response.data ?? {};
    return Promise.reject(
      new ApiClientError(toUserMessage(payload.code, payload.message, payload.errors), {
        code: payload.code,
        status: error.response.status,
        fieldErrors: payload.errors,
      }),
    );
  },
);
