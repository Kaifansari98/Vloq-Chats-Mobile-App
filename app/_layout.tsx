import '../global.css';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
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
import { COLORS } from '@/constants/theme';

const HAS_SEEN_WELCOME_KEY = 'vloq_has_seen_welcome';

type InitialRoute = '/(app)/(tabs)' | '/(auth)/login' | null;

function AppNavigator() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [hasSeen, token, user] = await Promise.all([
          AsyncStorage.getItem(HAS_SEEN_WELCOME_KEY),
          getToken(),
          getUser<AuthenticatedUser>(),
        ]);

        if (token && user) {
          store.dispatch(setCredentials({ user, token }));
        }

        if (token) {
          setInitialRoute('/(app)/(tabs)');
        } else if (hasSeen === 'true') {
          setInitialRoute('/(auth)/login');
        }
      } catch (error) {
        console.error('Failed to bootstrap auth state', error);
      } finally {
        setReady(true);
      }
    }

    void bootstrap();
  }, []);

  // Runs only after a render where the Stack below was actually mounted —
  // expo-router requires the root layout to render a navigator before
  // accepting navigation, so this can't happen inside bootstrap() itself.
  useEffect(() => {
    if (!ready || !initialRoute) return;
    router.replace(initialRoute);
  }, [ready, initialRoute]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
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
