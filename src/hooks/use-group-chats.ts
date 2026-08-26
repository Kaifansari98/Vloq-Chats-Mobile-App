import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GroupChat, Chat } from "@/hooks/use-direct-chats";

export type GroupParticipantFull = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  profile_pic_url?: string | null;
  userTypeCode?: string;
  role?: string;
  isAdmin?: boolean;
};

export type FullGroupDetails = {
  id: number;
  uuid: string;
  type: "GROUP";
  name: string;
  avatarUrl?: string | null;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  mediaCount: number;
  docsCount: number;
  linksCount: number;
  participants: GroupParticipantFull[];
};

export type GroupMediaItem = {
  id: string;
  type: "IMAGE" | "VIDEO" | "FILE" | "LINK";
  url: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  senderName: string;
};

type GroupDetailsResponse = {
  data: FullGroupDetails;
};

type GroupMediaResponse = {
  data: GroupMediaItem[];
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
      const { data } = await api.post<{ data: { uuid: string; name: string } }>("/chats/group", {
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

  return useQuery<FullGroupDetails | null>({
    queryKey: ["group-details", conversationUuid],
    enabled: typeof conversationUuid === "string" && conversationUuid.length > 0,
    queryFn: async () => {
      try {
        const { data } = await api.get<GroupDetailsResponse>(`/chats/group/${conversationUuid}`);
        return data.data;
      } catch (err) {
        console.warn("Failed to fetch group details via endpoint", err);
        return null;
      }
    },
  });
}

export function useGroupMedia(
  conversationUuid?: string,
  type: "media" | "docs" | "links" | "all" = "all"
) {
  return useQuery<GroupMediaItem[]>({
    queryKey: ["group-media", conversationUuid, type],
    enabled: typeof conversationUuid === "string" && conversationUuid.length > 0,
    queryFn: async () => {
      const { data } = await api.get<GroupMediaResponse>(
        `/chats/group/${conversationUuid}/media?type=${type}`
      );
      return data.data ?? [];
    },
  });
}

export function useAddGroupMembers(conversationUuid?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberIds: number[]) => {
      const { data } = await api.post<GroupDetailsResponse>(
        `/chats/group/${conversationUuid}/members`,
        { memberIds }
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-details", conversationUuid] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}

export function useRemoveGroupMember(conversationUuid?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: number) => {
      const { data } = await api.delete(
        `/chats/group/${conversationUuid}/members/${memberId}`
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-details", conversationUuid] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}
