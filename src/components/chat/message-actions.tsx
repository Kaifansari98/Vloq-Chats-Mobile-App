import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DirectMessage } from '@/hooks/use-direct-messages';
import { getMessagePreview } from '@/lib/message-preview';

type ActionItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  onPress: () => void;
  destructive?: boolean;
};

export function MessageActionsSheet({
  visible,
  message,
  isPinned,
  onClose,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  message: DirectMessage | null;
  isPinned: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      slideAnim.setValue(300);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  function animateClose(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  }

  function handleAction(action: () => void) {
    animateClose(action);
  }

  if (!message) return null;

  const hasTextContent = Boolean(message.content?.trim());

  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const messageAge = message.createdAt
    ? Date.now() - new Date(message.createdAt).getTime()
    : Infinity;
  const isWithinEditWindow = messageAge >= 0 && messageAge <= EDIT_WINDOW_MS;

  const canEditMessage =
    message.isOwnMessage &&
    (message.type === 'TEXT' || message.type === 'DEFAULT' || !message.type) &&
    hasTextContent &&
    message.attachments.length === 0 &&
    !message.isDeleted &&
    isWithinEditWindow;

  const actions: ActionItem[] = [
    {
      key: 'reply',
      label: 'Reply',
      icon: 'arrow-undo-outline' as const,
      iconColor: 'rgba(255,255,255,0.85)',
      onPress: () => handleAction(onReply),
    },
    ...(canEditMessage && onEdit
      ? [
          {
            key: 'edit',
            label: 'Edit Message',
            icon: 'pencil-outline' as const,
            iconColor: 'rgba(255,255,255,0.85)',
            onPress: () => handleAction(onEdit),
          },
        ]
      : []),
    {
      key: 'forward',
      label: 'Forward',
      icon: 'arrow-redo-outline' as const,
      iconColor: 'rgba(255,255,255,0.85)',
      onPress: () => handleAction(onForward),
    },
    ...(hasTextContent
      ? [
          {
            key: 'copy',
            label: 'Copy Text',
            icon: 'copy-outline' as const,
            iconColor: 'rgba(255,255,255,0.85)',
            onPress: () => {
              // eslint-disable-next-line @typescript-eslint/no-deprecated
              Clipboard.setString(message.content ?? '');
              animateClose();
            },
          },
        ]
      : []),
    isPinned
      ? {
          key: 'unpin',
          label: 'Unpin Message',
          icon: 'pin-outline' as const,
          iconColor: 'rgba(255,255,255,0.85)',
          onPress: () => handleAction(onUnpin),
        }
      : {
          key: 'pin',
          label: 'Pin Message',
          icon: 'pin-outline' as const,
          iconColor: 'rgba(255,255,255,0.85)',
          onPress: () => handleAction(onPin),
        },
    ...(onDelete
      ? [
          {
            key: 'delete',
            label: 'Delete Message',
            icon: 'trash-outline' as const,
            iconColor: '#f87171',
            destructive: true,
            onPress: () => handleAction(onDelete),
          },
        ]
      : []),
  ];

  // Short preview of the message for context
  const preview = message.content?.trim()
    ? message.content.length > 80
      ? `${message.content.slice(0, 80)}…`
      : message.content
    : getMessagePreview(message);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => animateClose()}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity }}
        >
          <Pressable className="flex-1" onPress={() => animateClose()} />
        </Animated.View>

        <Animated.View
          className="rounded-t-3xl bg-[#1a1a1a] pb-8 pt-2"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          {/* Handle bar */}
          <View className="items-center pb-3 pt-1">
            <View className="h-1 w-10 rounded-full bg-white/25" />
          </View>

          {/* Message preview */}
          <View className="mx-4 mb-4 rounded-2xl bg-white/5 px-4 py-3">
            <Text className="text-[11px] font-semibold text-white/40">
              {message.senderName}
            </Text>
            <Text numberOfLines={2} className="mt-0.5 text-[13px] text-white/70">
              {preview}
            </Text>
          </View>

          {/* Action buttons */}
          <View className="mx-4 overflow-hidden rounded-2xl bg-white/[0.06]">
            {actions.map((action, index) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                className="flex-row items-center gap-4 px-5 py-3.5 active:bg-white/5"
                style={
                  index < actions.length - 1
                    ? { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' }
                    : undefined
                }
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Ionicons name={action.icon} size={18} color={action.iconColor} />
                </View>
                <Text
                  className="flex-1 text-[15px] font-medium"
                  style={{ color: action.destructive ? '#f87171' : '#ffffff' }}
                >
                  {action.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="rgba(255,255,255,0.2)"
                />
              </Pressable>
            ))}
          </View>

          {/* Cancel button */}
          <Pressable
            onPress={() => animateClose()}
            className="mx-4 mt-3 items-center rounded-2xl bg-white/[0.06] py-3.5 active:bg-white/10"
          >
            <Text className="text-[15px] font-semibold text-white/60">Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
