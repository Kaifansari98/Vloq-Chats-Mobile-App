import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type CreateGroupResponse = {
  data: { uuid: string; name: string };
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
    },
  });
}
