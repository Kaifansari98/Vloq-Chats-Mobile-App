import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
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
  action: 'edit_name' | 'edit_photo' | 'logout';
  isDestructive?: boolean;
};

const SETTINGS_ITEMS: SettingsRowData[] = [
  {
    icon: 'person-outline',
    title: 'Edit Display Name',
    subtitle: 'Update your full name',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
    action: 'edit_name',
  },
  {
    icon: 'camera-outline',
    title: 'Change Profile Photo',
    subtitle: 'Choose from camera or gallery',
    iconColor: '#ffffff',
    iconBg: 'rgba(255, 255, 255, 0.1)',
    action: 'edit_photo',
  },
  {
    icon: 'log-out-outline',
    title: 'Log Out',
    subtitle: 'Sign out of your account',
    iconColor: '#f87171',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    action: 'logout',
    isDestructive: true,
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
          <Text className={`text-[16px] font-semibold ${item.isDestructive ? 'text-red-400' : 'text-white'}`}>
            {item.title}
          </Text>
          <Text className={`text-[13px] ${item.isDestructive ? 'text-red-400/50' : 'text-white/40'} mt-1`}>
            {item.subtitle}
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={item.isDestructive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.25)'}
      />
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
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [customAlertInfo, setCustomAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  function showCustomAlert(title: string, message: string) {
    setCustomAlertInfo({ visible: true, title, message });
  }

  const user = fetchedUser || authUser;
  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const profilePic = user?.profile_pic_url ?? null;
  const orgName = user?.organizationName ?? 'Vloq Workspace';
  const roleCode = user?.userTypeCode ?? 'MEMBER';

  const isAdmin =
    user?.userTypeCode === 'ADMIN' ||
    user?.userTypeCode === 'ORG_ADMIN' ||
    user?.userTypeCode?.toUpperCase().includes('ADMIN') ||
    (user as any)?.role === 'ADMIN';

  function handleLogout() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLogoutModalOpen(true);
  }

  async function processSelectedImage(uri: string, filename?: string) {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await uploadPicMutation.mutateAsync({ uri, name: filename });
      showCustomAlert('Success', 'Profile picture updated successfully!');
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      showCustomAlert('Upload Error', 'Could not update profile picture. Please try again.');
    }
  }

  async function pickImageFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showCustomAlert('Permission Needed', 'Camera access is required to take a profile picture.');
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
      showCustomAlert('Permission Needed', 'Photo library access is required to pick a profile picture.');
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
    setIsPhotoSheetOpen(true);
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
      showCustomAlert('Error', 'Failed to update name. Please try again.');
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
        <View className="mx-4 mt-3 bg-white/5 rounded-[24px] border border-white/10 overflow-hidden">
          {SETTINGS_ITEMS.map((item, i) => (
            <SettingsRow
              key={item.title}
              item={item}
              showDivider={i < SETTINGS_ITEMS.length - 1}
              onPress={() => {
                if (item.action === 'edit_name') handleOpenEditName();
                else if (item.action === 'edit_photo') handleEditPhoto();
                else if (item.action === 'logout') handleLogout();
              }}
            />
          ))}
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

      {/* Custom Change Profile Photo Sheet */}
      <Modal
        visible={isPhotoSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPhotoSheetOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <Pressable className="flex-1" onPress={() => setIsPhotoSheetOpen(false)} />
          <View className="bg-[#121212] rounded-t-[32px] border-t border-white/10 p-6 pb-8">
            <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-5" />

            <Text className="text-[20px] font-extrabold text-white text-center mb-1">
              Change Profile Photo
            </Text>
            <Text className="text-[13px] text-white/50 text-center mb-6">
              Choose how you would like to update your avatar
            </Text>

            <View className="gap-3">
              <Pressable
                onPress={() => {
                  setIsPhotoSheetOpen(false);
                  setTimeout(() => void pickImageFromCamera(), 200);
                }}
                className="flex-row items-center bg-white/7 border border-white/10 rounded-2xl p-4 active:bg-white/15"
              >
                <View className="h-11 w-11 rounded-full bg-blue-500/20 items-center justify-center mr-4">
                  <Ionicons name="camera" size={22} color="#60a5fa" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-semibold text-white">Take Photo</Text>
                  <Text className="text-[13px] text-white/40 mt-0.5">Use your device camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsPhotoSheetOpen(false);
                  setTimeout(() => void pickImageFromGallery(), 200);
                }}
                className="flex-row items-center bg-white/7 border border-white/10 rounded-2xl p-4 active:bg-white/15"
              >
                <View className="h-11 w-11 rounded-full bg-purple-500/20 items-center justify-center mr-4">
                  <Ionicons name="images" size={22} color="#c084fc" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-semibold text-white">Choose from Gallery</Text>
                  <Text className="text-[13px] text-white/40 mt-0.5">Select photo from library</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setIsPhotoSheetOpen(false)}
              className="mt-5 py-3.5 bg-white/10 rounded-2xl items-center active:bg-white/15"
            >
              <Text className="text-[15px] font-semibold text-white/80">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Custom Logout Confirmation Sheet */}
      <Modal
        visible={isLogoutModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsLogoutModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <Pressable className="flex-1" onPress={() => setIsLogoutModalOpen(false)} />
          <View className="bg-[#121212] rounded-t-[32px] border-t border-white/10 p-6 pb-8">
            <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-5" />

            <View className="h-14 w-14 rounded-full bg-red-500/15 border border-red-500/30 items-center justify-center self-center mb-4">
              <Ionicons name="log-out-outline" size={28} color="#ef4444" />
            </View>

            <Text className="text-[20px] font-extrabold text-white text-center mb-1">
              Log out of Vloq Chats?
            </Text>
            <Text className="text-[13px] text-white/50 text-center px-4 mb-6 leading-5">
              You'll be signed out of your account and redirected to the login page.
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-3.5 bg-white/10 border border-white/10 rounded-2xl items-center active:bg-white/15"
              >
                <Text className="text-[15px] font-semibold text-white/80">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsLogoutModalOpen(false);
                  logoutMutation.mutate();
                }}
                disabled={logoutMutation.isPending}
                className="flex-1 py-3.5 bg-red-600 border border-red-500 rounded-2xl items-center active:bg-red-700 disabled:opacity-50"
              >
                {logoutMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">Log Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={customAlertInfo.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setCustomAlertInfo((prev) => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm bg-[#18181b] rounded-[28px] border border-white/10 p-6 items-center">
            <View className="h-12 w-12 rounded-full bg-blue-500/20 border border-blue-500/30 items-center justify-center mb-3">
              <Ionicons name="information-circle" size={26} color="#60a5fa" />
            </View>
            <Text className="text-[18px] font-extrabold text-white text-center mb-1">
              {customAlertInfo.title}
            </Text>
            <Text className="text-[13px] text-white/60 text-center mb-5 leading-5">
              {customAlertInfo.message}
            </Text>
            <Pressable
              onPress={() => setCustomAlertInfo((prev) => ({ ...prev, visible: false }))}
              className="w-full py-3 bg-white/15 border border-white/15 rounded-2xl items-center active:bg-white/25"
            >
              <Text className="text-[15px] font-bold text-white">OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
