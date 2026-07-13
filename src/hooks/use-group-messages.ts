import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DirectMessage } from "@/hooks/use-direct-messages";

type GroupMessagesResponse = { data: DirectMessage[] };
type SendGroupMessageResponse = { message: string; data: DirectMessage };

export function useGroupMessages(conversationUuid?: string) {
  return useQuery<GroupMessagesResponse>({
    queryKey: ["group-messages", conversationUuid],
    enabled: typeof conversationUuid === "string" && conversationUuid.length > 0,
    queryFn: async () => {
      const { data } = await api.get<GroupMessagesResponse>(
        `/chats/group/${conversationUuid}/messages`
      );
      return data;
    },
  });
}

export function useSendGroupMessage(conversationUuid?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      replyToMessageUuid,
    }: {
      content: string;
      replyToMessageUuid?: string;
    }) => {
      const { data } = await api.post<SendGroupMessageResponse>(
        `/chats/group/${conversationUuid}/messages`,
        { content, ...(replyToMessageUuid && { replyToMessageUuid }) }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}

export function useUploadGroupMessage(conversationUuid?: string) {
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
      const { data } = await api.post<SendGroupMessageResponse>(
        `/chats/group/${conversationUuid}/messages/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}
