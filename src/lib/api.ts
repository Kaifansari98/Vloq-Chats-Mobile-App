import axios from "axios";
import { getToken, clearAuth } from "@/lib/storage";
import { router } from "expo-router";

import Constants from "expo-constants";

const environment =
  (process.env.EXPO_PUBLIC_ENVIRONMENT?.toUpperCase() ?? "PRODUCTION");

const productionApiUrl = "https://api-chat.nexyn.com/";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

function getLocalApiUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as Record<string, any>).manifest?.debuggerHost ||
    (Constants as Record<string, any>).manifest2?.extra?.expoGo?.developer?.tool;

  if (typeof hostUri === "string" && hostUri.length > 0) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
      return `http://${hostIp}:4000/`;
    }
  }

  return configuredApiUrl || "http://192.168.1.105:4000/";
}

export const API_BASE_URL =
  environment === "LOCAL" ? getLocalApiUrl() : productionApiUrl;

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
