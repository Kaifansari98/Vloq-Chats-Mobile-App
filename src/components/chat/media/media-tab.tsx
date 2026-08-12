import { useMemo, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { MediaGridItem } from './media-grid-item';
import { resolveAttachmentType } from '@/lib/message-preview';
import type { DirectMessage, MessageAttachment } from '@/hooks/use-direct-messages';

type GroupedMediaSection = {
  title: string;
  data: Array<{
    attachment: MessageAttachment;
    message: DirectMessage;
  }>;
};

export function MediaTab({
  messages,
  onPressMedia,
  selectedUuids,
  onToggleSelect,
  isSelectionMode,
}: {
  messages: DirectMessage[];
  onPressMedia: (attachment: MessageAttachment, index: number) => void;
  selectedUuids?: Set<string>;
  onToggleSelect?: (uuid: string) => void;
  isSelectionMode?: boolean;
}) {
  const { width } = useWindowDimensions();
  const numColumns = 3;
  const gap = 2;
  const tileSize = (width - gap * (numColumns + 1)) / numColumns;

  // Memoize grouped media sections
  const mediaItems = useMemo(() => {
    const items: Array<{ attachment: MessageAttachment; message: DirectMessage }> = [];

    // Reverse messages to show newest first
    const sorted = [...messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const msg of sorted) {
      for (const att of msg.attachments) {
        const type = resolveAttachmentType(att);
        if (type === 'image' || type === 'gif' || type === 'video') {
          items.push({ attachment: att, message: msg });
        }
      }
    }

    return items;
  }, [messages]);

  // Group by Month & Year (e.g., "July 2026")
  const sections = useMemo(() => {
    const map = new Map<string, Array<{ attachment: MessageAttachment; message: DirectMessage }>>();

    for (const item of mediaItems) {
      const monthKey = format(parseISO(item.message.createdAt), 'MMMM yyyy');
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(item);
    }

    const result: GroupedMediaSection[] = [];
    map.forEach((data, title) => {
      result.push({ title, data });
    });

    return result;
  }, [mediaItems]);

  if (mediaItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <Ionicons name="images-outline" size={40} color="rgba(255,255,255,0.25)" />
        </View>
        <Text className="mt-4 text-center text-[16px] font-semibold text-white/50">
          No media shared yet
        </Text>
        <Text className="mt-1 text-center text-[13px] text-white/30">
          Photos and videos shared in this chat will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={mediaItems}
      numColumns={numColumns}
      keyExtractor={(item) => item.attachment.uuid}
      contentContainerStyle={{ padding: gap, paddingBottom: 60 }}
      columnWrapperStyle={{ gap }}
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
      renderItem={({ item, index }) => {
        const isSelected = selectedUuids?.has(item.attachment.uuid);
        return (
          <MediaGridItem
            attachment={item.attachment}
            tileSize={tileSize}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            onPress={() => {
              if (isSelectionMode && onToggleSelect) {
                onToggleSelect(item.attachment.uuid);
              } else {
                onPressMedia(item.attachment, index);
              }
            }}
            onLongPress={() => {
              if (onToggleSelect) {
                onToggleSelect(item.attachment.uuid);
              }
            }}
          />
        );
      }}
    />
  );
}
