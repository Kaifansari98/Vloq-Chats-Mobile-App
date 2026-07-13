import { useQuery } from "@tanstack/react-query";
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
