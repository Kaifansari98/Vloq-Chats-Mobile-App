import { Stack } from 'expo-router';
import { ChatSocketProvider } from '@/hooks/use-chat-socket';

export default function AppLayout() {
  return (
    <ChatSocketProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </ChatSocketProvider>
  );
}
