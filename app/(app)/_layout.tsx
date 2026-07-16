import { Stack } from 'expo-router/stack';
import { ChatSocketProvider } from '@/hooks/use-chat-socket';
import { COLORS } from '@/constants/theme';

export default function AppLayout() {
  return (
    <ChatSocketProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </ChatSocketProvider>
  );
}
