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
 * Configure foreground notification display (WhatsApp style).
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
 * Register notification categories for quick actions (Reply, Mark Read).
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
    console.log('[FCM] Notification category "message" registered');
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
 * Send FCM/Expo token payload to the backend server.
 */
async function sendPushTokenToBackend(token: string, tokenType: 'fcm' | 'expo'): Promise<void> {
  try {
    await api.post('/users/push-tokens', {
      token,
      tokenType,
      platform: Platform.OS,
      userAgent: `${Platform.OS} ${Constants.platform?.android?.versionCode ?? ''}`.trim(),
    });
    console.log(`[FCM] Token (${tokenType}) successfully synced with backend`);
  } catch (error) {
    console.warn('[FCM] Failed to sync push token with backend:', error);
  }
}

/**
 * Main Push Notification Hook
 * 1. Checks Redux & AsyncStorage cache first (prevents redundant generation).
 * 2. Generates FCM Device Token once if not cached.
 * 3. Saves token to Redux & AsyncStorage.
 * 4. Syncs token with backend API.
 * 5. Handles notification interactions (Tap, Reply, Mark Read).
 */
export function usePushNotifications() {
  const { token: authToken, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const reduxFcmToken = useAppSelector((state) => state.auth.fcmToken);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
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

        // Check AsyncStorage cache
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

        // Request Permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[FCM] Push notification permission denied by user');
          return;
        }

        // Generate FCM Device Token (Natively via Firebase)
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
              '\n⚠️ [FCM WARNING]: Firebase is not initialized in the currently running Android APK build!\n' +
                '👉 REBUILD REQUIRED: Stop the running "npx expo run:android" terminal and re-run "npx expo run:android" so Gradle compiles google-services.json into your native Android app.\n',
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

          // Store in Redux
          dispatch(setFcmToken(generatedToken));

          // Store in AsyncStorage for persistent cache
          await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, generatedToken);

          // Sync token to Backend
          await sendPushTokenToBackend(generatedToken, tokenType);
        } else {
          console.warn('[FCM] Unable to generate push token. Please check build & device setup.');
        }
      } catch (err) {
        console.error('[FCM] Fatal error during push notification setup:', err);
      }
    }

    void initPushNotifications();

    // Listen for notification taps and inline actions
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

        if (actionId === 'REPLY') {
          const userReply = (response as any).userText;
          console.log(`[FCM] Reply action triggered: "${userReply}"`);
          return;
        }

        if (actionId === 'MARK_READ') {
          console.log(`[FCM] Mark read action triggered for chat: ${data?.chatId}`);
          return;
        }

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
  }, [isAuthenticated, authToken, dispatch, reduxFcmToken]);
}

/**
 * Utility function to clear FCM token cache (e.g. on logout or app reset)
 */
export async function clearFcmTokenCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    console.log('[FCM] Cache cleared');
  } catch (err) {
    console.warn('[FCM] Failed to clear token cache:', err);
  }
}
