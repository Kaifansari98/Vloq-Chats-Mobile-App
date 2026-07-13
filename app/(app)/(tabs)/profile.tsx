import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useLogout } from '@/hooks/use-logout';

export default function ProfileScreen() {
  const { user } = useAuth();
  const logoutMutation = useLogout();

  function handleLogout() {
    Alert.alert(
      'Log out of Vloq Chats?',
      "You'll be signed out of your account and redirected to the login page.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => logoutMutation.mutate(),
        },
      ],
    );
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-indigo-500">
        <Text className="text-2xl font-bold text-white">{initials}</Text>
      </View>

      <View className="items-center">
        <Text className="text-lg font-semibold text-white">
          {user?.name ?? 'You'}
        </Text>
        <Text className="mt-1 text-sm text-white/50">{user?.email ?? ''}</Text>
      </View>

      <Pressable
        onPress={handleLogout}
        disabled={logoutMutation.isPending}
        className="flex-row items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 active:opacity-70"
      >
        {logoutMutation.isPending ? (
          <ActivityIndicator color="#f87171" size="small" />
        ) : null}
        <Text className="text-sm font-semibold text-red-400">
          {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
        </Text>
      </Pressable>
    </View>
  );
}
