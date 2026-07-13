import axios from "axios";
import { getToken, clearAuth } from "@/lib/storage";
import { router } from "expo-router";

const API_URLS_BY_ENVIRONMENT: Record<string, string> = {
  LOCAL: "http://localhost:4000/",
  PRODUCTION: "https://api-chat.butterflyai.io/",
};

const environment =
  (process.env.EXPO_PUBLIC_ENVIRONMENT?.toUpperCase() ?? "LOCAL");

export const API_BASE_URL =
  API_URLS_BY_ENVIRONMENT[environment] ?? API_URLS_BY_ENVIRONMENT.LOCAL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token from AsyncStorage on every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 → clear auth and redirect to login (skip if already on auth screens)
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? "";
      const isAuthEndpoint = url.includes("/auth/");
      if (!isAuthEndpoint) {
        await clearAuth();
        router.replace("/(auth)/login");
      }
    }
    return Promise.reject(error);
  }
);
