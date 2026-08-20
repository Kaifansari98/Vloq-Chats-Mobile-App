import { Stack } from 'expo-router/stack';
import { ChatSocketProvider } from '@/hooks/use-chat-socket';
import { InAppNotificationProvider } from '@/providers/in-app-notification-provider';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { COLORS } from '@/constants/theme';

export default function AppLayout() {
  // Register for push notifications when authenticated
  usePushNotifications();

  return (
    <ChatSocketProvider>
      <InAppNotificationProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen
            name="create-group"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
      </InAppNotificationProvider>
    </ChatSocketProvider>
  );
}
