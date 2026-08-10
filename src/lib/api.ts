import axios from "axios";
import { getToken, clearAuth } from "@/lib/storage";
import { router } from "expo-router";

const environment =
  (process.env.EXPO_PUBLIC_ENVIRONMENT?.toUpperCase() ?? "PRODUCTION");

const productionApiUrl = "https://api-chat.nexyn.com/";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// Expo public variables are embedded when Metro starts. For LOCAL, use the
// Mac's LAN IP from .env so a physical phone can reach the Nest server.
export const API_BASE_URL =
  environment === "LOCAL" && configuredApiUrl
    ? configuredApiUrl
    : productionApiUrl;

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
