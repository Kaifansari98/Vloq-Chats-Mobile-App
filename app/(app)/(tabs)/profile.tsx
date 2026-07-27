import React from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useLogout } from '@/hooks/use-logout';
import { Loader } from '@/components/ui/Loader';

// ─── Layout constants ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 110;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type SettingsRowData = {
  icon: IconName;
  title: string;
  subtitle: string;
  color: string;
};

// ─── Settings items matching the screenshot ──────────────────────────────────
const SETTINGS_ITEMS: SettingsRowData[] = [
  {
    icon: 'person-outline',
    title: 'Account',
    subtitle: 'Number, Username, Bio',
    color: '#34383bff', // Telegram blue
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Chat Settings',
    subtitle: 'Wallpaper, Night Mode, Animations',
    color: '#34383bff', // Orange
  },
  {
    icon: 'lock-closed-outline',
    title: 'Privacy & Security',
    subtitle: 'Last Seen, Devices, Passkeys',
    color: '#34383bff', // Green
  },
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    subtitle: 'Sounds, Calls, Badges',
    color: '#34383bff', // Red
  },
  {
    icon: 'pie-chart-outline',
    title: 'Data and Storage',
    subtitle: 'Media download settings',
    color: '#34383bff', // Blue
  },
  {
    icon: 'folder-open-outline',
    title: 'Chat Folders',
    subtitle: 'Sort chats into folders',
    color: '#34383bff', // Light Blue
  },
  {
    icon: 'desktop-outline',
    title: 'Devices',
    subtitle: 'Manage connected devices',
    color: '#34383bff', // Teal
  },
  {
    icon: 'battery-charging-outline',
    title: 'Power Saving',
    subtitle: 'Reduce power usage on low charge',
    color: '#34383bff', // Amber
  },
  {
    icon: 'globe-outline',
    title: 'Language',
    subtitle: 'English',
    color: '#34383bff', // Purple
  },
];

// ─── Settings row component ───────────────────────────────────────────────────
function SettingsRow({
  item,
  showDivider = true,
  onPress,
}: {
  item: SettingsRowData;
  showDivider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 active:bg-white/5"
    >
      {/* Circle color badge behind white icon */}
      <View
        className="h-[30px] w-[30px] rounded-full items-center justify-center"
        style={{ backgroundColor: item.color }}
      >
        <Ionicons name={item.icon} size={15} color="#ffffff" />
      </View>
      <View className={`flex-1 ml-4 py-3.5 ${showDivider ? 'border-b border-white/5' : ''}`}>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-white">{item.title}</Text>
          <Text className="text-[13px] text-white/40 mt-1">{item.subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  // ── User details ────────────────────────────────────────────────────────────
  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const profilePic = user?.profile_pic_url ?? null;
  const usernameHandle = `@${userName.toLowerCase().replace(/\s+/g, '')}`;

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  function handleEditPhoto() {
    Alert.alert('Change Profile Photo', 'Choose an option', [
      { text: 'Camera', onPress: () => Alert.alert('Coming Soon', 'Camera integration coming soon!') },
      { text: 'Gallery', onPress: () => Alert.alert('Coming Soon', 'Gallery picker coming soon!') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const statusBarH = insets.top || (StatusBar.currentHeight ?? 44);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Top Header Actions (Back, Search, More) ─────────────────────────── */}
      <View
        className="flex-row items-center justify-between px-3"
        style={{ paddingTop: statusBarH, height: statusBarH + 56 }}
      >
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          onPress={() => Alert.alert('Back', 'Go back')}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
            onPress={() => Alert.alert('Search', 'Search settings')}
          >
            <Ionicons name="search" size={22} color="#ffffff" />
          </Pressable>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
            onPress={() => Alert.alert('Options', 'More options')}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Profile Header Section ────────────────────────────────────────── */}
        <View className="items-center pb-6">
          <View className="relative mb-4" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
            <Avatar name={userName} url={profilePic} size={AVATAR_SIZE} />
            {/* Camera badge overlay - slightly inset */}
            <Pressable
              onPress={handleEditPhoto}
              className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-[#0088cc] border-2 border-background"
            >
              <Ionicons name="camera" size={15} color="#ffffff" />
            </Pressable>
          </View>

          <Text className="text-[24px] font-bold text-white">{userName}</Text>
          <Text className="text-[14px] text-white/50 mt-1.5">{userEmail} • {usernameHandle}</Text>
        </View>

        {/* ── Settings Card (Grouped card surface matches settings.tsx style) ── */}
        <View className="mx-4 mt-3 bg-[#1E293B] rounded-[24px] border border-white/5 overflow-hidden">
          {SETTINGS_ITEMS.map((item, i) => (
            <SettingsRow
              key={item.title}
              item={item}
              showDivider={i < SETTINGS_ITEMS.length - 1}
              onPress={() => Alert.alert(item.title, 'Coming Soon!')}
            />
          ))}
        </View>

        {/* ── Log Out Row ──────────────────────────────────────────────────── */}
        <View className="mx-4 mt-3 bg-[#1E293B] rounded-[24px] border border-white/5 overflow-hidden">
          <Pressable
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex-row items-center justify-center gap-2 py-4 active:bg-white/5"
          >
            {logoutMutation.isPending ? (
              <Loader size={20} color="#f87171" />
            ) : (
              <Ionicons name="log-out-outline" size={22} color="#f87171" />
            )}
            <Text className="text-[16px] font-semibold text-red-400">
              {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
            </Text>
          </Pressable>
        </View>

        {/* Extra spacer to guarantee it clears the custom tab bar completely */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}
