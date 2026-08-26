import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { clearAuth } from "@/lib/storage";
import { disconnectSocket } from "@/lib/socket";
import { clearCredentials } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";
import { deactivatePushTokenOnLogout } from "@/hooks/use-push-notifications";

export function useLogout() {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async () => {
      await deactivatePushTokenOnLogout();
      await clearAuth();
    },
    onSuccess: () => {
      disconnectSocket();
      dispatch(clearCredentials());
      router.replace("/(auth)/login");
    },
  });
}
