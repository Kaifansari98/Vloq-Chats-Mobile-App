import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MessageAttachment = {
  uuid: string;
  attachmentType: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export type DirectMessage = {
  uuid: string;
  conversationUuid: string;
  senderId: number;
  senderUuid: string;
  senderName: string;
  content: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
  isOwnMessage: boolean;
  status: "sent" | "read";
  readAt?: string | null;
  attachments: MessageAttachment[];
  replyTo?: {
    uuid: string;
    senderName: string;
    content: string | null;
    attachmentType: string | null;
  } | null;
};

type DirectMessagesResponse = { data: DirectMessage[] };
type SendDirectMessageResponse = { message: string; data: DirectMessage };

export function useDirectMessages(participantUserId?: number) {
  return useQuery<DirectMessagesResponse>({
    queryKey: ["direct-messages", participantUserId],
    enabled: typeof participantUserId === "number",
    queryFn: async () => {
      const { data } = await api.get<DirectMessagesResponse>(
        "/chats/direct/messages",
        { params: { participantUserId } }
      );
      return data;
    },
  });
}

export function useSendDirectMessage(participantUserId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      replyToMessageUuid,
    }: {
      content: string;
      replyToMessageUuid?: string;
    }) => {
      const { data } = await api.post<SendDirectMessageResponse>(
        "/chats/direct/messages",
        {
          participantUserId,
          content,
          ...(replyToMessageUuid && { replyToMessageUuid }),
        }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["direct-messages", participantUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}

export function useUploadDirectMessage(participantUserId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      files,
      replyToMessageUuid,
    }: {
      content: string;
      files: Array<{ uri: string; name: string; type: string }>;
      replyToMessageUuid?: string;
    }) => {
      const formData = new FormData();
      formData.append("participantUserId", String(participantUserId));
      if (content.trim()) formData.append("content", content.trim());
      if (replyToMessageUuid)
        formData.append("replyToMessageUuid", replyToMessageUuid);
      for (const file of files) {
        formData.append("files", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob);
      }
      const { data } = await api.post<SendDirectMessageResponse>(
        "/chats/direct/messages/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["direct-messages", participantUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}

export function useMarkDirectChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participantUserId: number) => {
      const { data } = await api.post<{ message: string }>(
        "/chats/direct/messages/read",
        { participantUserId }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}
