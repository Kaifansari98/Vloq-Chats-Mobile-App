import { useDirectInfo } from '@/hooks/use-direct-info';
import { GroupMediaModal } from '@/components/chat/group-media-modal';
import { showDialog, AppModal as Modal } from '@/components/ui/app-dialog';
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  participantUserId: number;
  name: string;
  profilePicUrl?: string | null;
  email?: string | null;
  isOnline?: boolean;
  onClose: () => void;
};

export function UserInfoModal({
  visible,
  participantUserId,
  name: fallbackName,
  profilePicUrl: fallbackProfilePicUrl,
  email: fallbackEmail,
  isOnline,
  onClose,
}: UserInfoModalProps) {
  const insets = useSafeAreaInsets();
  const info = useDirectInfo(participantUserId, visible);
  const name = info.data?.participant.name ?? fallbackName;
  const profilePicUrl = info.data ? info.data.participant.profilePicUrl : fallbackProfilePicUrl;
  const email = info.data?.participant.email ?? fallbackEmail;
  const [mediaVisible, setMediaVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const avatarBg = getAvatarColor(name || 'User');

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[s.modalContainer, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Header bar */}
        <View style={s.headerBar}>
          <Pressable onPress={onClose} hitSlop={10} style={s.iconBtn}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </Pressable>

          <Text style={s.headerTitle}>Chat Info</Text>

          <Pressable
            onPress={() => {
              showDialog('Chat Options', 'More options coming soon!');
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
                colors={[avatarBg, `${avatarBg}cc`]}
                style={s.heroAvatarGradient}
              >
                <Text style={s.heroAvatarText}>{getInitials(name || 'User')}</Text>
              </LinearGradient>
            )}

            <Text style={s.heroTitle}>{name}</Text>
            <Text style={s.heroSubtitle}>{isOnline ? 'Online' : 'Offline'}</Text>

            {/* Quick Action Buttons */}
            <View style={s.actionRow}>
              <Pressable
                style={s.actionCard}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setMediaVisible(true);
                }}
              >
                <View style={s.actionIconBox}>
                  <Ionicons name="images-outline" size={20} color="#60a5fa" />
                </View>
                <Text style={s.actionLabel}>Media</Text>
              </Pressable>

              <Pressable
                style={s.actionCard}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsMuted(!isMuted);
                }}
              >
                <View style={s.actionIconBox}>
                  <Ionicons
                    name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                    size={20}
                    color="#60a5fa"
                  />
                </View>
                <Text style={s.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </Pressable>

              <Pressable
                style={s.actionCard}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onClose();
                }}
              >
                <View style={s.actionIconBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#60a5fa" />
                </View>
                <Text style={s.actionLabel}>Message</Text>
              </Pressable>
            </View>
          </View>

          {/* User Details / Info Section */}
          <View style={s.sectionCard}>
            {email ? (
              <View style={s.infoItem}>
                <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                <View style={s.infoTextContainer}>
                  <Text style={s.infoLabel}>Email</Text>
                  <Text style={s.infoValue}>{email}</Text>
                </View>
              </View>
            ) : null}

            <View style={[s.infoItem, !email && { borderTopWidth: 0 }]}>
              <Ionicons name="information-circle-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              <View style={s.infoTextContainer}>
                <Text style={s.infoLabel}>About</Text>
                <Text style={s.infoValue}>Hey there! I am using ButterflyAI.</Text>
              </View>
            </View>
          </View>

          {/* Settings / Controls */}
          <View style={s.sectionCard}>
            <Pressable
              style={s.settingRow}
              onPress={() => {
                void Haptics.selectionAsync();
                setMediaVisible(true);
              }}
            >
              <View style={s.settingLeft}>
                <Ionicons name="images-outline" size={20} color="#60a5fa" />
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>Media, links, and docs</Text>
                  {info.data && <Text style={[s.infoLabel, { marginTop: 4 }]}>{info.data.mediaCount} photos/videos · {info.data.docsCount} docs · {info.data.linksCount} links</Text>}
                </View>
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
        </ScrollView>
      </View>
    </Modal>
    <GroupMediaModal visible={visible && mediaVisible} groupUuid="" groupName={name}
      participantUserId={participantUserId} onClose={() => setMediaVisible(false)} />
    </>
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
});
