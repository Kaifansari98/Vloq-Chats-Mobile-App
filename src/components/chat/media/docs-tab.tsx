import { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DocumentRow, type DocumentItem } from './document-row';
import { resolveAttachmentType } from '@/lib/message-preview';
import type { DirectMessage } from '@/hooks/use-direct-messages';

export function DocsTab({ messages }: { messages: DirectMessage[] }) {
  const docItems = useMemo(() => {
    const docs: DocumentItem[] = [];

    // Newest messages first
    const sorted = [...messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const msg of sorted) {
      for (const att of msg.attachments) {
        const type = resolveAttachmentType(att);
        if (type === 'document') {
          docs.push({
            attachment: att,
            messageUuid: msg.uuid,
            senderName: msg.senderName,
            createdAt: msg.createdAt,
          });
        }
      }
    }

    return docs;
  }, [messages]);

  if (docItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.25)" />
        </View>
        <Text className="mt-4 text-center text-[16px] font-semibold text-white/50">
          No documents shared yet
        </Text>
        <Text className="mt-1 text-center text-[13px] text-white/30">
          Documents shared in this chat will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={docItems}
      keyExtractor={(item) => item.attachment.uuid}
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 60 }}
      ItemSeparatorComponent={() => <View className="ml-16 h-px bg-white/5" />}
      renderItem={({ item }) => <DocumentRow doc={item} />}
    />
  );
}
