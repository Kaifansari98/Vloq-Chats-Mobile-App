import * as SecureStore from "expo-secure-store";

import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_TOKEN_KEY = "vloq_access_token";
export const AUTH_USER_KEY = "vloq_auth_user";
export const FCM_TOKEN_STORAGE_KEY = "@vloq_fcm_token";
export const DEFAULT_ORGANIZATION_ID = 5;

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getUser<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
    AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY),
  ]);
}
