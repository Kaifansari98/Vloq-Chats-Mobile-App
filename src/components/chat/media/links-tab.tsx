import { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinkPreviewCard, type ExtractedLinkItem } from './link-preview-card';
import type { DirectMessage } from '@/hooks/use-direct-messages';

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

export function LinksTab({
  messages,
  onJumpToMessage,
}: {
  messages: DirectMessage[];
  onJumpToMessage?: (messageUuid: string) => void;
}) {
  const extractedLinks = useMemo(() => {
    const links: ExtractedLinkItem[] = [];
    const seenMap = new Set<string>();

    // Newest messages first
    const sorted = [...messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const msg of sorted) {
      if (!msg.content) continue;

      const matched = msg.content.match(URL_REGEX);
      if (!matched) continue;

      const messageLinksSeen = new Set<string>();

      for (let rawUrl of matched) {
        // Standardize www. to https://www.
        const normalizedUrl = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;

        const uniqueKey = `${msg.uuid}-${normalizedUrl}`;
        if (messageLinksSeen.has(uniqueKey)) continue;
        messageLinksSeen.add(uniqueKey);

        links.push({
          url: normalizedUrl,
          messageUuid: msg.uuid,
          senderName: msg.senderName,
          createdAt: msg.createdAt,
          contextText: msg.content,
        });
      }
    }

    return links;
  }, [messages]);

  if (extractedLinks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <Ionicons name="link-outline" size={40} color="rgba(255,255,255,0.25)" />
        </View>
        <Text className="mt-4 text-center text-[16px] font-semibold text-white/50">
          No links shared yet
        </Text>
        <Text className="mt-1 text-center text-[13px] text-white/30">
          Links shared in this chat will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={extractedLinks}
      keyExtractor={(item, index) => `${item.messageUuid}-${index}`}
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 60 }}
      renderItem={({ item }) => (
        <LinkPreviewCard link={item} onJumpToMessage={onJumpToMessage} />
      )}
    />
  );
}
