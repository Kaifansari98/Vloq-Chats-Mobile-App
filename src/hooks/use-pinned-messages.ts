import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DirectMessage } from '@/hooks/use-direct-messages';

const STORAGE_KEY_PREFIX = 'pinned_message:';

type PinnedEntry = {
  messageUuid: string;
  content: string | null;
  senderName: string;
  attachmentType: string | null;
  pinnedAt: string;
};

function storageKey(chatId: string): string {
  return `${STORAGE_KEY_PREFIX}${chatId}`;
}

/**
 * Manages a single pinned message per chat, persisted via AsyncStorage.
 * Returns the pinned entry (if any) plus pin / unpin helpers.
 */
export function usePinnedMessage(chatId: string) {
  const [pinned, setPinned] = useState<PinnedEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load pinned message on mount / chatId change
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void AsyncStorage.getItem(storageKey(chatId)).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          setPinned(JSON.parse(raw) as PinnedEntry);
        } catch {
          setPinned(null);
        }
      } else {
        setPinned(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const pinMessage = useCallback(
    async (message: DirectMessage) => {
      const entry: PinnedEntry = {
        messageUuid: message.uuid,
        content: message.content,
        senderName: message.senderName,
        attachmentType:
          message.attachments.length > 0
            ? message.attachments[0].attachmentType
            : null,
        pinnedAt: new Date().toISOString(),
      };
      setPinned(entry);
      await AsyncStorage.setItem(storageKey(chatId), JSON.stringify(entry));
    },
    [chatId],
  );

  const unpinMessage = useCallback(async () => {
    setPinned(null);
    await AsyncStorage.removeItem(storageKey(chatId));
  }, [chatId]);

  return { pinned, isLoading, pinMessage, unpinMessage };
}
