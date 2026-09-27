import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DirectInfo = {
  conversationUuid: string | null;
  participant: { id: number; uuid: string; name: string; email: string; profilePicUrl: string | null };
  mediaCount: number;
  docsCount: number;
  linksCount: number;
};

export function useDirectInfo(participantUserId: number | undefined, visible: boolean) {
  return useQuery({
    queryKey: ['direct-info', participantUserId],
    enabled: visible && Number.isSafeInteger(participantUserId) && (participantUserId ?? 0) > 0,
    queryFn: async () => {
      const { data } = await api.get<{ data: DirectInfo }>(`/app/chats/direct/${participantUserId}/info`);
      return data.data;
    },
  });
}
