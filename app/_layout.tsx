import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { queryClient } from '@/lib/query-client';
import { store } from '@/store';
import { setCredentials } from '@/store/auth-slice';
import { getToken, getUser, AUTH_TOKEN_KEY } from '@/lib/storage';
import type { AuthenticatedUser } from '@/types/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const HAS_SEEN_WELCOME_KEY = 'vloq_has_seen_welcome';

function AppNavigator() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const [hasSeen, token, user] = await Promise.all([
        AsyncStorage.getItem(HAS_SEEN_WELCOME_KEY),
        getToken(),
        getUser<AuthenticatedUser>(),
      ]);

      if (token && user) {
        store.dispatch(setCredentials({ user, token }));
      }

      setReady(true);

      if (token) {
        router.replace('/(app)/(tabs)');
      } else if (hasSeen === 'true') {
        router.replace('/(auth)/login');
      }
    }

    void bootstrap();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
        </QueryClientProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
