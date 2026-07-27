import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

/**
 * Configure how notifications are presented when the app is in foreground.
 * WhatsApp-style: show system heads-up banner with sound even while app is open.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register WhatsApp-style notification category with Reply & Mark as Read actions.
 * This runs once at module load so the category is available before any notification fires.
 */
async function registerNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('message', [
      {
        identifier: 'REPLY',
        buttonTitle: 'Reply',
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Type a message...',
        },
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'MARK_READ',
        buttonTitle: 'Mark as Read',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
    console.log('Notification category "message" registered with Reply & Mark as Read');
  } catch (error) {
    console.warn('Failed to register notification category:', error);
  }
}

// Register categories immediately
void registerNotificationCategories();

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if permissions are denied, unavailable, or running in Expo Go.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not determined yet
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
        sound: 'default',
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'New chat message notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
        sound: 'default',
        enableVibrate: true,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    // This will fail in Expo Go (SDK 53+) — that's expected.
    // Push notifications only work in development/production builds.
    console.warn('Push notifications not available (likely running in Expo Go):', error);
    return null;
  }
}

/**
 * Send the push token to the backend so the server can send push notifications.
 */
async function sendPushTokenToBackend(pushToken: string): Promise<void> {
  try {
    await api.post('/notifications/push-token', {
      token: pushToken,
      platform: Platform.OS,
    });
    console.log('Push token registered with backend');
  } catch (error) {
    console.warn('Failed to register push token with backend:', error);
  }
}

/**
 * Hook that sets up push notifications:
 * 1. Requests permission & registers for push notifications
 * 2. Sends the push token to the backend
 * 3. Handles notification actions (Reply, Mark as Read, tap)
 */
export function usePushNotifications() {
  const { token, isAuthenticated } = useAuth();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Register and send token to backend
    void registerForPushNotificationsAsync().then((pushToken) => {
      if (pushToken) {
        void sendPushTokenToBackend(pushToken);
      }
    });

    // Handle notification actions (Reply, Mark as Read, tap)
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as {
          chatId?: string;
          isGroup?: boolean;
          memberId?: number;
          name?: string;
          profilePicUrl?: string;
          conversationUuid?: string;
          senderName?: string;
        } | undefined;

        // Handle "Reply" action — user typed a reply from the notification
        if (actionId === 'REPLY') {
          const userReply = (response as any).userText;
          console.log(`Quick reply to ${data?.senderName ?? data?.chatId}: "${userReply}"`);

          // TODO: Send the reply via your API/socket
          // Example: api.post(`/conversations/${data?.chatId}/messages`, { content: userReply });
          return;
        }

        // Handle "Mark as Read" action
        if (actionId === 'MARK_READ') {
          console.log(`Marked as read: ${data?.chatId}`);

          // TODO: Call your API to mark the conversation as read
          // Example: api.post(`/conversations/${data?.chatId}/read`);
          return;
        }

        // Default tap — open the chat screen
        if (data?.chatId || data?.conversationUuid) {
          router.push({
            pathname: '/(app)/chat/[id]',
            params: {
              id: data.chatId ?? data.conversationUuid ?? '',
              isGroup: data.isGroup ? '1' : '0',
              memberId: String(data.memberId ?? 0),
              name: data.name ?? data.senderName ?? 'Chat',
              profilePicUrl: data.profilePicUrl ?? '',
            },
          });
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [isAuthenticated, token]);
}

