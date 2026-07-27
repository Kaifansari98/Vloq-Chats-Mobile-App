import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export type ExtractedLinkItem = {
  url: string;
  messageUuid: string;
  senderName: string;
  createdAt: string;
  contextText: string;
  title?: string;
  description?: string;
  imageUrl?: string;
};

export function getDomainFromUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LinkPreviewCard({
  link,
  onJumpToMessage,
}: {
  link: ExtractedLinkItem;
  onJumpToMessage?: (messageUuid: string) => void;
}) {
  const domain = getDomainFromUrl(link.url);
  const formattedDate = format(new Date(link.createdAt), 'MMM d, yyyy · h:mm a');

  return (
    <View className="mx-4 my-1.5 overflow-hidden rounded-2xl border border-white/8 bg-white/5">
      <Pressable
        onPress={() => void Linking.openURL(link.url)}
        className="flex-row items-center gap-3 p-3.5 active:bg-white/10"
      >
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#60a5fa]/15">
          <Ionicons name="globe-outline" size={24} color="#60a5fa" />
        </View>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-semibold text-[#60a5fa]">
            {link.title || domain}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-white/45">
            {link.url}
          </Text>
          {link.description ? (
            <Text numberOfLines={2} className="mt-1 text-[12px] text-white/60">
              {link.description}
            </Text>
          ) : null}
        </View>

        <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.3)" />
      </Pressable>

      {/* Context footer */}
      <View className="flex-row items-center justify-between border-t border-white/5 bg-black/20 px-3.5 py-2">
        <Text numberOfLines={1} className="flex-1 text-[11px] text-white/35">
          Shared by <Text className="font-semibold text-white/50">{link.senderName}</Text> · {formattedDate}
        </Text>

        {onJumpToMessage ? (
          <Pressable
            onPress={() => onJumpToMessage(link.messageUuid)}
            hitSlop={6}
            className="flex-row items-center gap-1 rounded-full bg-white/10 px-2 py-1 active:bg-white/20"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text className="text-[10px] font-medium text-white/70">Jump</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
