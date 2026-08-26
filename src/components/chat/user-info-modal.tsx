import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/theme';
import { resolveMediaUrl } from '@/lib/api';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#3b82f6', '#06b6d4', '#f59e0b',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type UserInfoModalProps = {
  visible: boolean;
  name: string;
  profilePicUrl?: string | null;
  email?: string | null;
  isOnline?: boolean;
  onClose: () => void;
  onOpenMediaGallery?: () => void;
};

export function UserInfoModal({
  visible,
  name,
  profilePicUrl,
  email,
  isOnline,
  onClose,
  onOpenMediaGallery,
}: UserInfoModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const avatarBg = getAvatarColor(name || 'User');

  function handleBlockUser() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${name}? They will no longer be able to send you messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Blocked', `${name} has been blocked.`);
            onClose();
          },
        },
      ]
    );
  }

  function handleReportUser() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Report User',
      `Report ${name} for spam or inappropriate behavior?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reported', 'Thank you. We have received your report.');
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.modalContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

          {/* Header bar */}
          <View style={s.headerBar}>
            <Pressable onPress={onClose} hitSlop={10} style={s.iconBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>

            <Text style={s.headerTitle}>Contact Info</Text>

            <Pressable
              onPress={() => {
                Alert.alert('Contact Options', 'More options coming soon!');
              }}
              hitSlop={10}
              style={s.iconBtn}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* User Hero Section */}
            <View style={s.heroSection}>
              {profilePicUrl ? (
                <Image source={{ uri: resolveMediaUrl(profilePicUrl) }} style={s.heroAvatarImage} />
              ) : (
                <LinearGradient
                  colors={[avatarBg, '#312e81']}
                  style={s.heroAvatarGradient}
                >
                  <Text style={s.heroAvatarText}>{getInitials(name || 'User')}</Text>
                </LinearGradient>
              )}

              <Text style={s.heroTitle}>{name}</Text>
              <Text style={s.heroSubtitle}>
                {isOnline ? '🟢 Active now' : 'Offline'}
              </Text>
            </View>

            {/* Quick Action Buttons */}
            <View style={s.actionRow}>
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenMediaGallery?.();
                }}
                style={s.actionCard}
              >
                <View style={s.actionIconBox}>
                  <Ionicons name="images-outline" size={20} color="#60a5fa" />
                </View>
                <Text style={s.actionLabel}>Media</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsMuted((prev) => !prev);
                  void Haptics.selectionAsync();
                }}
                style={s.actionCard}
              >
                <View style={s.actionIconBox}>
                  <Ionicons
                    name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                    size={20}
                    color="#60a5fa"
                  />
                </View>
                <Text style={s.actionLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onClose();
                }}
                style={s.actionCard}
              >
                <View style={s.actionIconBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#60a5fa" />
                </View>
                <Text style={s.actionLabel}>Message</Text>
              </Pressable>
            </View>

            {/* Information Section */}
            <View style={s.sectionCard}>
              {email ? (
                <View style={s.infoItem}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                  <View style={s.infoTextContainer}>
                    <Text style={s.infoLabel}>Email</Text>
                    <Text style={s.infoValue}>{email}</Text>
                  </View>
                </View>
              ) : null}

              <View style={s.infoItem}>
                <Ionicons name="information-circle-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                <View style={s.infoTextContainer}>
                  <Text style={s.infoLabel}>About</Text>
                  <Text style={s.infoValue}>Hey there! I am using Vloq Chats.</Text>
                </View>
              </View>
            </View>

            {/* Settings & Options */}
            <View style={s.sectionCard}>
              <Pressable
                style={s.settingRow}
                onPress={() => {
                  onClose();
                  onOpenMediaGallery?.();
                }}
              >
                <View style={s.settingLeft}>
                  <Ionicons name="images-outline" size={20} color="#60a5fa" />
                  <Text style={s.settingLabel}>Media, links, and docs</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
              </Pressable>

              <View style={s.settingRow}>
                <View style={s.settingLeft}>
                  <Ionicons name="notifications-outline" size={20} color="#60a5fa" />
                  <Text style={s.settingLabel}>Mute Notifications</Text>
                </View>
                <Switch
                  value={isMuted}
                  onValueChange={(val) => {
                    setIsMuted(val);
                    void Haptics.selectionAsync();
                  }}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Danger Zone / Block & Report */}
            <View style={s.sectionCard}>
              <Pressable style={s.dangerRow} onPress={handleBlockUser}>
                <Ionicons name="ban-outline" size={20} color="#f87171" />
                <Text style={s.dangerLabel}>Block {name}</Text>
              </Pressable>

              <Pressable style={s.dangerRow} onPress={handleReportUser}>
                <Ionicons name="thumbs-down-outline" size={20} color="#f87171" />
                <Text style={s.dangerLabel}>Report {name}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#111111',
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroAvatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  heroAvatarText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionCard: {
    alignItems: 'center',
    width: 80,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  dangerLabel: {
    fontSize: 15,
    color: '#f87171',
    fontWeight: '600',
  },
});
