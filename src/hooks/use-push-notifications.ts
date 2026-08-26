import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFcmToken } from '@/store/auth-slice';
import { api } from '@/lib/api';

/**
 * Storage Key for FCM Token
 */
export const FCM_TOKEN_STORAGE_KEY = '@vloq_fcm_token';

/**
 * Configure foreground notification display (WhatsApp / Slack style).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Register notification categories for quick inline actions.
 */
async function registerNotificationCategories() {
  try {
    const actions: Notifications.NotificationAction[] = [
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
    ];

    await Notifications.setNotificationCategoryAsync('message', actions);
    await Notifications.setNotificationCategoryAsync('chat_message', actions);
    await Notifications.setNotificationCategoryAsync('group_message', actions);
    console.log('[FCM] Notification categories ("message", "chat_message", "group_message") registered successfully');
  } catch (error) {
    console.warn('[FCM] Category registration warning:', error);
  }
}

// Register categories at module load
void registerNotificationCategories();

export type PushTokensResult = {
  fcmToken: string | null;
  expoPushToken: string | null;
};

/**
 * Reusable Notification Permission Utility / Service
 */
export class NotificationPermissionService {
  static async checkPermission(): Promise<Notifications.PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.warn('[FCM Permission] Check error:', error);
      return Notifications.PermissionStatus.UNDETERMINED;
    }
  }

  static async requestPermission(): Promise<Notifications.PermissionStatus> {
    try {
      const existingStatus = await this.checkPermission();
      if (existingStatus === Notifications.PermissionStatus.GRANTED) {
        return existingStatus;
      }
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return status;
    } catch (error) {
      console.warn('[FCM Permission] Request error:', error);
      return Notifications.PermissionStatus.DENIED;
    }
  }
}

/**
 * Setup Android notification channels for high priority banners.
 */
async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Chat Messages',
      description: 'New chat message notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
      enableVibrate: true,
    });
  } catch (err) {
    console.warn('[FCM] Error setting up Android channels:', err);
  }
}

/**
 * Get device unique ID for multi-device token tracking.
 */
function getDeviceId(): string {
  const installationId = Constants.installationId || Constants.sessionId;
  if (installationId) {
    return `${Platform.OS}_${installationId}`;
  }
  return `${Platform.OS}_device`;
}

/**
 * Send FCM token payload to backend API.
 */
async function sendPushTokenToBackend(token: string, tokenType: 'fcm' | 'expo'): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const userAgent = `${Platform.OS} ${Constants.platform?.android?.versionCode ?? ''}`.trim();

    await api.post('/users/push-tokens', {
      token,
      tokenType,
      platform: Platform.OS,
      deviceId,
      userAgent,
    });
    console.log(`[FCM] Token (${tokenType}) successfully synced with backend for device: ${deviceId}`);
  } catch (error) {
    console.warn('[FCM] Failed to sync push token with backend:', error);
  }
}

/**
 * Centralized Notification Navigation Handler
 */
export function navigateToNotificationTarget(data?: {
  type?: string;
  chatType?: string;
  conversationId?: string;
  groupId?: string;
  chatId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  conversationName?: string;
  isGroup?: boolean | string;
  name?: string;
  profilePicUrl?: string;
  memberId?: number | string;
}) {
  if (!data) return;

  const targetConversationId = data.conversationId ?? data.groupId ?? data.chatId;
  if (!targetConversationId) return;

  const isGroupChat =
    data.type === 'group_message' ||
    data.chatType === 'group' ||
    data.isGroup === true ||
    data.isGroup === '1' ||
    data.isGroup === 'true';

  const name =
    data.name ??
    data.conversationName ??
    data.senderName ??
    (isGroupChat ? 'Group Chat' : 'Chat');

  console.log(`[FCM Tap Navigation] Navigating to conversation "${targetConversationId}" (IsGroup: ${isGroupChat}, Name: ${name})`);

  router.push({
    pathname: '/(app)/chat/[id]',
    params: {
      id: targetConversationId,
      isGroup: isGroupChat ? '1' : '0',
      memberId: String(data.memberId ?? data.senderId ?? 0),
      name,
      profilePicUrl: data.profilePicUrl ?? '',
    },
  });
}

/**
 * Main Push Notification Hook
 */
export function usePushNotifications() {
  const { token: authToken, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const reduxFcmToken = useAppSelector((state) => state.auth.fcmToken);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const tokenRefreshListener = useRef<Notifications.EventSubscription | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    async function initPushNotifications() {
      try {
        // Skip in StoreClient (Expo Go)
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
          console.info(
            '[FCM] Running in Expo Go. Remote push tokens require development/production builds. Local notifications will still work.',
          );
          return;
        }

        // Setup channels for Android
        await setupAndroidChannels();

        // 1. Handle Cold Start Notification Tap (if app was killed and opened via tap)
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          console.log('[FCM] Cold start notification tap detected');
          const data = lastResponse.notification.request.content.data as any;
          navigateToNotificationTarget(data);
        }

        // 2. Check AsyncStorage cache
        const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);

        if (cachedToken) {
          console.log('\n====================================================');
          console.log('🔥 [FCM TOKEN CACHED & LOADED FROM STORAGE] 🔥');
          console.log('TOKEN:', cachedToken);
          console.log('====================================================\n');

          if (!reduxFcmToken) {
            dispatch(setFcmToken(cachedToken));
          }
          // Sync with backend
          await sendPushTokenToBackend(cachedToken, 'fcm');
          return;
        }

        // 3. Request Notification Permission
        const permissionStatus = await NotificationPermissionService.requestPermission();
        if (permissionStatus !== Notifications.PermissionStatus.GRANTED) {
          console.warn('[FCM] Push notification permission denied by user');
          return;
        }

        // 4. Generate FCM Device Token (Natively via Firebase)
        let generatedToken: string | null = null;
        let tokenType: 'fcm' | 'expo' = 'fcm';

        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          if (deviceTokenData && deviceTokenData.data) {
            generatedToken = deviceTokenData.data;
          }
        } catch (fcmErr: any) {
          const errMsg = String(fcmErr?.message || fcmErr);
          if (errMsg.includes('FirebaseApp is not initialized')) {
            console.warn(
              '\n⚠️ [FCM WARNING]: Firebase is not initialized in the currently running Android build!\n' +
                '👉 Ensure google-services.json is compiled into your Android build.\n',
            );
          } else {
            console.warn('[FCM] Native getDevicePushTokenAsync error:', fcmErr);
          }
        }

        // Fallback to Expo Push Token if native FCM token call did not return
        if (!generatedToken) {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          if (projectId) {
            try {
              const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
              if (expoTokenData && expoTokenData.data) {
                generatedToken = expoTokenData.data;
                tokenType = 'expo';
              }
            } catch (expoErr) {
              console.warn('[FCM] Expo push token fallback error:', expoErr);
            }
          }
        }

        if (generatedToken) {
          console.log('\n====================================================');
          console.log(`🔥 [NEW ${tokenType.toUpperCase()} TOKEN GENERATED SUCCESSFULLY] 🔥`);
          console.log('TOKEN:', generatedToken);
          console.log('====================================================\n');

          dispatch(setFcmToken(generatedToken));
          await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, generatedToken);
          await sendPushTokenToBackend(generatedToken, tokenType);
        } else {
          console.warn('[FCM] Unable to generate push token. Please check build & device setup.');
        }
      } catch (err) {
        console.error('[FCM] Fatal error during push notification setup:', err);
      }
    }

    void initPushNotifications();

    // 5. Listen for FCM Token Refresh
    tokenRefreshListener.current = Notifications.addPushTokenListener((tokenData) => {
      if (tokenData && tokenData.data) {
        console.log('🔄 [FCM TOKEN REFRESHED]:', tokenData.data);
        dispatch(setFcmToken(tokenData.data));
        void AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, tokenData.data);
        void sendPushTokenToBackend(tokenData.data, 'fcm');
      }
    });

    // 6. Listen for notification taps and inline actions while app is running/backgrounded
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as any;
        const notificationId = response.notification.request.identifier;

        if (actionId === 'REPLY') {
          const userReply = ((response as any).userText || '').trim();
          console.log(`[FCM] Reply action triggered: "${userReply}"`);
          if (userReply) {
            const isGroup =
              data?.type === 'group_message' ||
              data?.chatType === 'group' ||
              data?.isGroup === true ||
              data?.isGroup === '1';
            const conversationUuid = data?.conversationId ?? data?.groupId ?? data?.chatId;
            const senderIdNum = Number(data?.senderId ?? data?.memberId ?? 0);

            if (isGroup && conversationUuid) {
              api.post(`/chats/group/${conversationUuid}/messages`, { content: userReply })
                .then(() => console.log('[FCM] Group reply sent successfully'))
                .catch((err) => console.warn('[FCM] Group reply API error:', err));
            } else if (senderIdNum > 0) {
              api.post('/chats/direct/messages', { participantUserId: senderIdNum, content: userReply })
                .then(() => console.log('[FCM] Direct reply sent successfully'))
                .catch((err) => console.warn('[FCM] Direct reply API error:', err));
            }
          }
          void Notifications.dismissNotificationAsync(notificationId).catch(() => {});
          return;
        }

        if (actionId === 'MARK_READ') {
          console.log(`[FCM] Mark read action triggered for chat: ${data?.chatId || data?.conversationId}`);
          const senderIdNum = Number(data?.senderId ?? data?.memberId ?? 0);
          if (senderIdNum > 0) {
            api.post('/chats/direct/messages/read', { participantUserId: senderIdNum })
              .then(() => console.log('[FCM] Successfully marked chat as read via notification'))
              .catch((err) => console.warn('[FCM] Mark read API error:', err));
          }
          void Notifications.dismissNotificationAsync(notificationId).catch(() => {});
          return;
        }

        navigateToNotificationTarget(data);
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
      if (tokenRefreshListener.current) {
        tokenRefreshListener.current.remove();
      }
    };
  }, [isAuthenticated, authToken, dispatch, reduxFcmToken]);
}

/**
 * Utility function to clear FCM token cache
 */
export async function clearFcmTokenCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    console.log('[FCM] Local token cache cleared');
  } catch (err) {
    console.warn('[FCM] Failed to clear token cache:', err);
  }
}

/**
 * Deactivate FCM token on backend when user logs out
 */
export async function deactivatePushTokenOnLogout(): Promise<void> {
  try {
    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (cachedToken) {
      console.log('[FCM] Deactivating push token on backend during logout...');
      await api.post('/users/push-tokens/remove', { token: cachedToken }).catch((err) => {
        console.warn('[FCM] Non-fatal: Backend token remove error:', err);
      });
      await clearFcmTokenCache();
    }
  } catch (err) {
    console.warn('[FCM] Error deactivating token on logout:', err);
  }
}
