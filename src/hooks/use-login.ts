import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { setToken, setUser } from "@/lib/storage";
import { setCredentials } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export function useLogin() {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const { data } = await api.post<LoginResponse>("/auth/login", payload);
      return data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        setToken(data.accessToken),
        setUser(data.user),
      ]);
      dispatch(setCredentials({ user: data.user, token: data.accessToken }));
      router.replace("/(app)/(tabs)");
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        return (error.response?.data?.message as string | undefined) ?? "Login failed";
      }
      return "Login failed";
    },
  });
}
