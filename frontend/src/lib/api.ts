import axios from "axios";
import { ApiClientError, toUserMessage } from "./errors";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const target = baseURL.startsWith("http") ? baseURL : "the local API";
      return Promise.reject(
        new ApiClientError(
          `Cannot reach ${target}. If that host is Render, wait for it to wake, allow this page origin in FRONTEND_URL, then retry.`,
        ),
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
