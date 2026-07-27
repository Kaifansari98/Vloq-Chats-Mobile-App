import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PinnedInfo = {
  messageUuid: string;
  content: string | null;
  senderName: string;
  attachmentType: string | null;
  pinnedAt: string;
};

export function PinnedBanner({
  pinned,
  onPress,
  onUnpin,
}: {
  pinned: PinnedInfo | null;
  onPress: () => void;
  onUnpin: () => void;
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pinned) {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: 52,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          delay: 80,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 200,
          delay: 60,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [pinned, heightAnim, opacityAnim]);

  if (!pinned) {
    return (
      <Animated.View style={{ height: heightAnim, overflow: 'hidden', opacity: opacityAnim }} />
    );
  }

  const previewText = pinned.content?.trim()
    ? pinned.content
    : pinned.attachmentType === 'IMAGE'
      ? '📷 Photo'
      : pinned.attachmentType === 'AUDIO'
        ? '🎙️ Voice message'
        : pinned.attachmentType === 'FILE'
          ? '📄 Document'
          : 'Message';

  return (
    <Animated.View
      style={{
        height: heightAnim,
        overflow: 'hidden',
        opacity: opacityAnim,
      }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center border-b border-white/8 bg-[#1a1a1a] px-3"
        style={{ height: 52 }}
      >
        {/* Pin icon + colored bar */}
        <View className="mr-3 flex-row items-center gap-2">
          <View className="h-8 w-1 rounded-full bg-[#f97316]" />
          <Ionicons name="pin" size={16} color="#f97316" />
        </View>

        {/* Content preview */}
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-semibold text-[#f97316]">Pinned Message</Text>
          <Text numberOfLines={1} className="text-[12px] text-white/60">
            {previewText}
          </Text>
        </View>

        {/* Close/unpin button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          hitSlop={10}
          className="ml-2 h-7 w-7 items-center justify-center rounded-full active:bg-white/10"
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
