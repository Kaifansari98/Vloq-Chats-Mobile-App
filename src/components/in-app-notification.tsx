import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import * as Haptics from 'expo-haptics';

export type InAppNotificationData = {
  id: string;
  senderName: string;
  senderProfilePicUrl?: string | null;
  message: string;
  /** Navigation params to pass when tapped */
  chatId: string;
  isGroup: boolean;
  memberId: number;
  profilePicUrl?: string | null;
};

type Props = {
  notification: InAppNotificationData | null;
  onDismiss: () => void;
  onPress: (notification: InAppNotificationData) => void;
};

const BANNER_HEIGHT = 80;
const AUTO_DISMISS_MS = 4000;

export function InAppNotificationBanner({ notification, onDismiss, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + insets.top + 20))).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNotifId = useRef<string | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.spring(translateY, {
      toValue: -(BANNER_HEIGHT + insets.top + 20),
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start(() => {
      currentNotifId.current = null;
      onDismiss();
    });
  }, [translateY, insets.top, onDismiss]);

  useEffect(() => {
    if (notification && notification.id !== currentNotifId.current) {
      currentNotifId.current = notification.id;

      // Haptic feedback
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }).start();

      // Auto dismiss
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }
  }, [notification, translateY, dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!notification) return null;

  const previewText = notification.message || 'Sent a message';
  const displayText = previewText.length > 80 ? previewText.slice(0, 80) + '…' : previewText;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
        paddingTop: insets.top + 6,
        paddingHorizontal: 12,
        paddingBottom: 8,
      }}
    >
      <Pressable
        onPress={() => {
          dismiss();
          onPress(notification);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#1e1e1e',
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          // shadow
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Avatar
          name={notification.senderName}
          url={notification.senderProfilePicUrl}
          size={44}
        />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              numberOfLines={1}
              style={{
                color: '#ffffff',
                fontSize: 15,
                fontWeight: '700',
                flex: 1,
              }}
            >
              {notification.senderName}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 11,
                marginLeft: 8,
              }}
            >
              now
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 13,
              marginTop: 2,
              lineHeight: 18,
            }}
          >
            {displayText}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
