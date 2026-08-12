import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GroupChat, Chat } from "@/hooks/use-direct-chats";

type CreateGroupResponse = {
  data: { uuid: string; name: string };
};

type GroupDetailsResponse = {
  data: GroupChat;
};

export function useCreateGroupChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      memberIds,
    }: {
      name: string;
      memberIds: number[];
    }) => {
      const { data } = await api.post<CreateGroupResponse>("/chats/group", {
        name,
        memberIds,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
      void queryClient.invalidateQueries({ queryKey: ["group-chats"] });
    },
  });
}

export function useGroupDetails(conversationUuid?: string) {
  const queryClient = useQueryClient();

  return useQuery<GroupChat | null>({
    queryKey: ["group-details", conversationUuid],
    enabled: typeof conversationUuid === "string" && conversationUuid.length > 0,
    queryFn: async () => {
      // 1. Check if we already have the group chat in direct-chats query cache
      const cachedChats = queryClient.getQueryData<{ data: Chat[] }>(["direct-chats", 1, "", "ALL"]) ||
        queryClient.getQueryData<{ data: Chat[] }>(["direct-chats", 1, "", "GROUPS"]);

      const foundInCache = cachedChats?.data?.find(
        (c): c is GroupChat => c.type === "GROUP" && c.uuid === conversationUuid
      );

      if (foundInCache) {
        return foundInCache;
      }

      // 2. Otherwise fetch from API endpoint
      try {
        const { data } = await api.get<GroupDetailsResponse>(`/chats/group/${conversationUuid}`);
        return data.data;
      } catch (err) {
        console.warn("Failed to fetch group details via endpoint, trying fallback cache search", err);
        return foundInCache || null;
      }
    },
  });
}
