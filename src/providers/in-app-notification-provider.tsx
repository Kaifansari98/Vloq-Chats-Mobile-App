import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { getOrCreateSocket } from '@/lib/socket';
import {
  InAppNotificationBanner,
  type InAppNotificationData,
} from '@/components/in-app-notification';
import { getNotificationPreview } from '@/lib/message-preview';
import * as Notifications from 'expo-notifications';

async function scheduleNativeNotification(params: {
  title: string;
  body: string;
  chatId: string;
  isGroup: boolean;
  memberId: number;
  senderName: string;
  profilePicUrl?: string | null;
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'message',
        data: {
          chatId: params.chatId,
          isGroup: params.isGroup,
          memberId: params.memberId,
          name: params.senderName,
          profilePicUrl: params.profilePicUrl ?? '',
        },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[InAppNotification] Native notification trigger failed:', error);
  }
}

type InAppNotificationContextType = {
  /** Manually show a notification (used for testing or custom triggers) */
  showNotification: (data: InAppNotificationData) => void;
};

const InAppNotificationContext = createContext<InAppNotificationContextType>({
  showNotification: () => {},
});

/**
 * Socket payload for incoming direct messages.
 * The server may send varying shapes; we handle the fields defensively.
 */
type DirectMessagePayload = {
  message?: {
    uuid?: string;
    content?: string | null;
    senderId?: number;
    senderUuid?: string;
    senderName?: string;
    senderProfilePicUrl?: string | null;
    conversationUuid?: string;
    isOwnMessage?: boolean;
    attachments?: Array<{ attachmentType?: string; mimeType?: string }>;
  };
  senderId?: number;
  senderUuid?: string;
  senderName?: string;
  senderProfilePicUrl?: string | null;
  conversationUuid?: string;
  content?: string | null;
};

type GroupMessagePayload = {
  message?: {
    uuid?: string;
    content?: string | null;
    senderId?: number;
    senderUuid?: string;
    senderName?: string;
    senderProfilePicUrl?: string | null;
    conversationUuid?: string;
    conversationName?: string;
    isOwnMessage?: boolean;
    attachments?: Array<{ attachmentType?: string; mimeType?: string }>;
  };
  conversationUuid?: string;
  conversationName?: string;
};

function getMessagePreview(payload: DirectMessagePayload | GroupMessagePayload): string {
  const msg = payload.message;
  return getNotificationPreview({
    content: msg?.content ?? (payload as DirectMessagePayload).content ?? null,
    attachments: msg?.attachments,
  });
}

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const pathname = usePathname();
  const [notification, setNotification] = useState<InAppNotificationData | null>(null);
  const pathnameRef = useRef(pathname);

  // Keep pathname ref up to date
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const showNotification = useCallback((data: InAppNotificationData) => {
    setNotification(data);
  }, []);

  const handleDismiss = useCallback(() => {
    setNotification(null);
  }, []);

  const handlePress = useCallback((notif: InAppNotificationData) => {
    router.push({
      pathname: '/(app)/chat/[id]',
      params: {
        id: notif.chatId,
        isGroup: notif.isGroup ? '1' : '0',
        memberId: String(notif.memberId),
        name: notif.senderName,
        profilePicUrl: notif.profilePicUrl ?? '',
      },
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateSocket(token);
    const currentUserUuid = user?.uuid;

    function handleDirectMessageNew(payload: DirectMessagePayload) {
      console.log('[InAppNotification] Received direct_message:new event. Payload:', JSON.stringify(payload));
      const msg = payload.message;
      const senderId = msg?.senderId ?? payload.senderId;
      const senderUuid = msg?.senderUuid ?? payload.senderUuid;

      console.log('[InAppNotification] Sender UUID:', senderUuid, 'Current User UUID:', currentUserUuid);

      // Don't show notification for own messages
      if (msg?.isOwnMessage) {
        console.log('[InAppNotification] Bypassed: msg.isOwnMessage is true');
        return;
      }
      if (senderUuid && senderUuid === currentUserUuid) {
        console.log('[InAppNotification] Bypassed: sender is current user');
        return;
      }

      const senderName = msg?.senderName ?? payload.senderName ?? 'Someone';
      const senderProfilePicUrl = msg?.senderProfilePicUrl ?? payload.senderProfilePicUrl ?? null;
      const conversationUuid = msg?.conversationUuid ?? payload.conversationUuid ?? '';
      const messageUuid = msg?.uuid ?? Date.now().toString();

      // Don't show if user is already on that chat screen
      const currentPath = pathnameRef.current;
      console.log('[InAppNotification] Current path:', currentPath, 'Target Conversation UUID:', conversationUuid);
      if (currentPath.includes('/chat/') && currentPath.includes(conversationUuid)) {
        console.log('[InAppNotification] Bypassed: user is already viewing this chat screen');
        return;
      }

      const preview = getMessagePreview(payload);
      console.log('[InAppNotification] Triggering native system notification for:', senderName, '-', preview);

      void scheduleNativeNotification({
        title: senderName,
        body: preview,
        chatId: conversationUuid,
        isGroup: false,
        memberId: senderId ?? 0,
        senderName,
        profilePicUrl: senderProfilePicUrl,
      });
    }

    function handleGroupMessageNew(payload: GroupMessagePayload) {
      console.log('[InAppNotification] Received group_message:new event. Payload:', JSON.stringify(payload));
      const msg = payload.message;
      const senderId = msg?.senderId;
      const senderUuid = msg?.senderUuid;

      console.log('[InAppNotification] Sender UUID:', senderUuid, 'Current User UUID:', currentUserUuid);

      // Don't show notification for own messages
      if (msg?.isOwnMessage) {
        console.log('[InAppNotification] Bypassed: msg.isOwnMessage is true');
        return;
      }
      if (senderUuid && senderUuid === currentUserUuid) {
        console.log('[InAppNotification] Bypassed: sender is current user');
        return;
      }

      const senderName = msg?.senderName ?? 'Someone';
      const senderProfilePicUrl = msg?.senderProfilePicUrl ?? null;
      const conversationUuid = msg?.conversationUuid ?? payload.conversationUuid ?? '';
      const conversationName = msg?.conversationName ?? payload.conversationName ?? 'Group';

      // Don't show if user is already on that chat screen
      const currentPath = pathnameRef.current;
      console.log('[InAppNotification] Current path:', currentPath, 'Target Conversation UUID:', conversationUuid);
      if (currentPath.includes('/chat/') && currentPath.includes(conversationUuid)) {
        console.log('[InAppNotification] Bypassed: user is already viewing this chat screen');
        return;
      }

      const preview = getMessagePreview(payload);
      console.log('[InAppNotification] Triggering native group system notification for:', senderName, 'in', conversationName, '-', preview);

      void scheduleNativeNotification({
        title: `${senderName} (${conversationName})`,
        body: preview,
        chatId: conversationUuid,
        isGroup: true,
        memberId: senderId ?? 0,
        senderName: conversationName,
        profilePicUrl: senderProfilePicUrl,
      });
    }

    socket.on('direct_message:new', handleDirectMessageNew);
    socket.on('group_message:new', handleGroupMessageNew);

    return () => {
      socket.off('direct_message:new', handleDirectMessageNew);
      socket.off('group_message:new', handleGroupMessageNew);
    };
  }, [token, user?.uuid, showNotification]);

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotification() {
  return useContext(InAppNotificationContext);
}
