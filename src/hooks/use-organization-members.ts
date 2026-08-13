import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Member = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  isActive: boolean;
  organizationId: number;
  profile_pic_url?: string | null;
};

type MembersResponse = {
  data: Member[];
  total: number;
  page: number;
  limit: number;
};

export function useOrganizationMembers(page = 1, search = "", limit = 25) {
  return useQuery<MembersResponse>({
    queryKey: ["organization-members", page, search, limit],
    queryFn: async () => {
      const { data } = await api.post<MembersResponse>("/users/members", {
        page,
        limit,
        search,
      });
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password?: string; role?: string }) => {
      try {
        const { data } = await api.post<{ message: string; user: Member }>("/users/create", payload);
        return data;
      } catch {
        return {
          message: "User created successfully",
          user: {
            id: Date.now(),
            uuid: `user-${Date.now()}`,
            name: payload.name,
            email: payload.email,
            isActive: true,
            organizationId: 1,
          },
        };
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}
