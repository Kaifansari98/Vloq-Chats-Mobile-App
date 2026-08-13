import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useLogout } from '@/hooks/use-logout';
import { Loader } from '@/components/ui/Loader';
import { useUploadProfilePic, useUpdateProfile, useFetchUserProfile } from '@/hooks/use-profile';

const AVATAR_SIZE = 110;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type SettingsRowData = {
  icon: IconName;
  title: string;
  subtitle: string;
  iconColor: string;
  iconBg: string;
};

const SETTINGS_ITEMS: SettingsRowData[] = [
  {
    icon: 'person-outline',
    title: 'Account',
    subtitle: 'Name, Role, Organization',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
  {
    icon: 'business-outline',
    title: 'Organization',
    subtitle: 'Workspace details & team',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Privacy & Security',
    subtitle: 'Passkeys, Active Sessions, Security',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    subtitle: 'Sounds, Badges, Chat Alerts',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
  {
    icon: 'pie-chart-outline',
    title: 'Data and Storage',
    subtitle: 'Media download & cache settings',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
  {
    icon: 'globe-outline',
    title: 'Language',
    subtitle: 'English (US)',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
  },
];

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
      <View
        className="h-[32px] w-[32px] rounded-full items-center justify-center"
        style={{ backgroundColor: item.iconBg }}
      >
        <Ionicons name={item.icon} size={17} color={item.iconColor} />
      </View>
      <View className={`flex-1 ml-4 py-3.5 ${showDivider ? 'border-b border-white/5' : ''}`}>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-white">{item.title}</Text>
          <Text className="text-[13px] text-white/40 mt-1">{item.subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { data: fetchedUser } = useFetchUserProfile();
  const logoutMutation = useLogout();
  const uploadPicMutation = useUploadProfilePic();
  const updateProfileMutation = useUpdateProfile();

  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editNameText, setEditNameText] = useState('');

  const user = fetchedUser || authUser;
  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const profilePic = user?.profile_pic_url ?? null;
  const orgName = user?.organizationName ?? 'Vloq Workspace';
  const roleCode = user?.userTypeCode ?? 'MEMBER';

  function handleLogout() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  async function processSelectedImage(uri: string, filename?: string) {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await uploadPicMutation.mutateAsync({ uri, name: filename });
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      Alert.alert('Upload Error', 'Could not update profile picture. Please try again.');
    }
  }

  async function pickImageFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processSelectedImage(result.assets[0].uri, result.assets[0].fileName ?? 'camera.jpg');
    }
  }

  async function pickImageFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to pick a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processSelectedImage(result.assets[0].uri, result.assets[0].fileName ?? 'gallery.jpg');
    }
  }

  function handleEditPhoto() {
    void Haptics.selectionAsync();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void pickImageFromCamera();
          else if (buttonIndex === 2) void pickImageFromGallery();
        }
      );
    } else {
      Alert.alert('Change Profile Photo', 'Choose an option to update your avatar', [
        { text: 'Take Photo', onPress: () => void pickImageFromCamera() },
        { text: 'Choose from Gallery', onPress: () => void pickImageFromGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function handleOpenEditName() {
    setEditNameText(userName);
    setIsEditNameModalOpen(true);
  }

  async function handleSaveName() {
    if (!editNameText.trim() || updateProfileMutation.isPending) return;
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateProfileMutation.mutateAsync({ name: editNameText.trim(), uuid: user?.uuid });
      setIsEditNameModalOpen(false);
    } catch (err) {
      console.error('Failed to update name', err);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  }

  const statusBarH = insets.top || (StatusBar.currentHeight ?? 44);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Bar */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: statusBarH, height: statusBarH + 52 }}
      >
        <Text className="text-[28px] font-extrabold text-white">Profile</Text>

        <Pressable
          onPress={handleOpenEditName}
          className="flex-row items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3.5 py-1.5 active:bg-white/20"
        >
          <Ionicons name="create-outline" size={16} color="#ffffff" />
          <Text className="text-[12px] font-semibold text-white">Edit Name</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Profile Card Header */}
        <View className="items-center pt-4 pb-6 px-4">
          <View className="relative mb-4" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
            <Avatar name={userName} url={profilePic} size={AVATAR_SIZE} />

            {/* Overlay spinner when uploading */}
            {uploadPicMutation.isPending && (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/60">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}

            {/* Camera badge overlay */}
            <Pressable
              onPress={handleEditPhoto}
              disabled={uploadPicMutation.isPending}
              className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-white/20 border-2 border-background shadow-lg active:bg-white/30"
            >
              <Ionicons name="camera" size={16} color="#ffffff" />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2">
            <Text className="text-[24px] font-extrabold text-white">{userName}</Text>
            <Pressable onPress={handleOpenEditName} hitSlop={6}>
              <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <Text className="text-[14px] text-white/50 mt-1">{userEmail}</Text>

          {/* Org & Role Badges */}
          <View className="flex-row items-center gap-2 mt-3">
            <View className="rounded-full bg-white/10 border border-white/10 px-3 py-1 flex-row items-center gap-1.5">
              <Ionicons name="business" size={12} color="rgba(255,255,255,0.7)" />
              <Text className="text-[12px] font-semibold text-white/80">{orgName}</Text>
            </View>

            <View className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 flex-row items-center gap-1.5">
              <Ionicons name="shield-checkmark" size={12} color="#34d399" />
              <Text className="text-[12px] font-semibold text-emerald-300">{roleCode}</Text>
            </View>
          </View>
        </View>

        {/* Settings Options Card */}
        <View className="mx-4 mt-1 bg-white/5 rounded-[24px] border border-white/10 overflow-hidden">
          {SETTINGS_ITEMS.map((item, i) => (
            <SettingsRow
              key={item.title}
              item={item}
              showDivider={i < SETTINGS_ITEMS.length - 1}
              onPress={() => {
                if (item.title === 'Account') handleOpenEditName();
                else Alert.alert(item.title, 'Settings view coming soon!');
              }}
            />
          ))}
        </View>

        {/* Log Out Section */}
        <View className="mx-4 mt-4 bg-white/5 rounded-[24px] border border-white/10 overflow-hidden">
          <Pressable
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex-row items-center justify-center gap-2 py-4 active:bg-white/5"
          >
            {logoutMutation.isPending ? (
              <Loader size={20} color="#f87171" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            )}
            <Text className="text-[16px] font-semibold text-red-400">
              {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Edit Name Modal Sheet */}
      <Modal
        visible={isEditNameModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditNameModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-[#111111] rounded-t-[28px] border-t border-white/10 p-6">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-bold text-white">Edit Name</Text>
              <Pressable onPress={() => setIsEditNameModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            <Text className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-2">
              DISPLAY NAME
            </Text>
            <View className="flex-row items-center bg-white/6 rounded-2xl px-4 py-2 border border-white/10 mb-6">
              <Ionicons name="person" size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                style={{ flex: 1, marginLeft: 10, fontSize: 16, color: '#ffffff' }}
                value={editNameText}
                onChangeText={setEditNameText}
                placeholder="Enter your full name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                maxLength={60}
                autoFocus
              />
            </View>

            <Pressable
              onPress={() => void handleSaveName()}
              disabled={!editNameText.trim() || updateProfileMutation.isPending}
              className="flex-row items-center justify-center py-3.5 bg-white/15 border border-white/15 rounded-2xl active:bg-white/25 disabled:opacity-40"
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-[15px] font-bold text-white">Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
