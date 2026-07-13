import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type NotificationItem = {
  uuid: string;
  type: "CHAT_MENTION";
  title: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  conversationUuid: string | null;
  messageUuid: string | null;
  metadata: {
    conversationName?: string;
    senderName?: string;
    senderId?: number;
    mentionedUserId?: number;
  } | null;
  senderProfilePicUrl: string | null;
};

type NotificationsResponse = {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
};

type UnreadCountResponse = { unreadCount: number };

export function useNotifications(page = 1, limit = 20) {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const { data } = await api.get<NotificationsResponse>("/notifications", {
        params: { page, limit },
      });
      return data;
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data } = await api.get<UnreadCountResponse>(
        "/notifications/unread-count"
      );
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationUuid: string) => {
      const { data } = await api.post<{ message: string }>(
        "/notifications/read",
        { notificationUuid }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>(
        "/notifications/read-all"
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
