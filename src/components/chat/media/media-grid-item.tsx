import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MessageAttachment } from '@/hooks/use-direct-messages';
import { resolveMediaUrl } from '@/lib/api';

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MediaGridItem({
  attachment,
  tileSize,
  isSelectionMode,
  isSelected,
  onPress,
  onLongPress,
}: {
  attachment: MessageAttachment;
  tileSize: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const isVideo = attachment.attachmentType === 'VIDEO' || attachment.mimeType?.startsWith('video/');
  const isHD = attachment.quality === 'HD';
  const mediaUrl = resolveMediaUrl(attachment.thumbnailUrl || attachment.url);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: tileSize, height: tileSize }}
      className="relative overflow-hidden bg-white/5"
    >
      <ExpoImage
        source={mediaUrl}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={150}
      />

      {/* Video duration & icon overlay */}
      {isVideo ? (
        <View className="absolute bottom-1 left-1.5 flex-row items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
          <Ionicons name="videocam" size={10} color="#ffffff" />
          <Text className="text-[10px] font-semibold text-white">
            {formatDuration(attachment.durationSeconds)}
          </Text>
        </View>
      ) : null}

      {/* HD badge */}
      {isHD ? (
        <View className="absolute top-1 left-1.5 rounded bg-black/60 px-1 py-0.2">
          <Text className="text-[9px] font-bold text-white">HD</Text>
        </View>
      ) : null}

      {/* Multiselect checkmark overlay */}
      {isSelectionMode ? (
        <View
          className={`absolute inset-0 items-center justify-center ${
            isSelected ? 'bg-[#60a5fa]/30' : 'bg-black/20'
          }`}
        >
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: isSelected ? '#60a5fa' : 'rgba(0,0,0,0.5)',
              borderWidth: isSelected ? 0 : 2,
              borderColor: 'rgba(255,255,255,0.7)',
            }}
          >
            {isSelected ? (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
