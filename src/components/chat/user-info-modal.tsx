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
  Modal as RNModal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/theme';
import { resolveMediaUrl } from '@/lib/api';

const AVATAR_COLORS = [
  '#00a884', '#075e54', '#128c7e', '#25d366',
  '#34b7f1', '#6366f1', '#8b5cf6', '#ec4899',
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
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaVisibility, setMediaVisibility] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState('Off');

  const avatarBg = getAvatarColor(name || 'User');
  const handle = email ? `@${email.split('@')[0]}` : `@${(name || 'user').toLowerCase().replace(/\s+/g, '')}`;

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
        <View style={[s.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
          <StatusBar barStyle="light-content" translucent backgroundColor="#0b141a" />

          {/* WhatsApp Header Bar */}
          <View style={s.headerBar}>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [s.headerIconBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="arrow-back" size={24} color="#e9edef" />
            </Pressable>

            <View style={s.headerTitleBox} />

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setOptionsMenuVisible(true);
              }}
              hitSlop={10}
              style={({ pressed }) => [s.headerIconBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#e9edef" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Profile Section */}
            <View style={s.heroSection}>
              {profilePicUrl ? (
                <Image source={{ uri: resolveMediaUrl(profilePicUrl) }} style={s.avatarImage} />
              ) : (
                <View style={[s.avatarGradient, { backgroundColor: avatarBg }]}>
                  <Text style={s.avatarText}>{getInitials(name || 'User')}</Text>
                </View>
              )}

              <Text style={s.nameText}>{name}</Text>
              <Text style={s.handleText}>{handle}</Text>

              {/* Action Buttons Row (Audio, Video, Search) */}
              <View style={s.actionRow}>
                {/* Audio Call */}
                <Pressable
                  style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    showDialog('Audio Call', `Calling ${name}...`);
                  }}
                >
                  <Ionicons name="call-outline" size={22} color="#00a884" />
                  <Text style={s.actionText}>Audio</Text>
                </Pressable>

                {/* Video Call */}
                <Pressable
                  style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    showDialog('Video Call', `Starting video call with ${name}...`);
                  }}
                >
                  <Ionicons name="videocam-outline" size={22} color="#00a884" />
                  <Text style={s.actionText}>Video</Text>
                </Pressable>

                {/* Search in Chat */}
                <Pressable
                  style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onClose();
                  }}
                >
                  <Ionicons name="search-outline" size={22} color="#00a884" />
                  <Text style={s.actionText}>Search</Text>
                </Pressable>
              </View>
            </View>

            {/* Separator Gap */}
            <View style={s.sectionDivider} />

            {/* Section 1: Notifications, Media, Kept Messages */}
            <View style={s.sectionCard}>
              {/* Notifications */}
              <Pressable
                style={s.rowItem}
                onPress={() => {
                  setIsMuted(!isMuted);
                  void Haptics.selectionAsync();
                }}
              >
                <Ionicons
                  name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                  size={22}
                  color="#8696a0"
                  style={s.rowIcon}
                />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Notifications</Text>
                  <Text style={s.rowSubtitle}>{isMuted ? 'Muted' : 'On'}</Text>
                </View>
                <Switch
                  value={!isMuted}
                  onValueChange={(val) => {
                    setIsMuted(!val);
                    void Haptics.selectionAsync();
                  }}
                  trackColor={{ false: '#233138', true: '#00a884' }}
                  thumbColor="#ffffff"
                />
              </Pressable>

              {/* Media visibility */}
              <Pressable
                style={s.rowItem}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setMediaVisible(true);
                }}
              >
                <Ionicons name="image-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Media visibility</Text>
                  <Text style={s.rowSubtitle}>
                    {info.data
                      ? `${info.data.mediaCount} media · ${info.data.docsCount} docs`
                      : mediaVisibility
                      ? 'Default (Yes)'
                      : 'Off'}
                  </Text>
                </View>
              </Pressable>

              {/* Kept messages */}
              <Pressable
                style={[s.rowItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  showDialog('Kept Messages', 'No starred or kept messages in this chat.');
                }}
              >
                <Ionicons name="bookmark-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Kept messages</Text>
                </View>
              </Pressable>
            </View>

            {/* Separator Gap */}
            <View style={s.sectionDivider} />

            {/* Section 2: Privacy, Encryption, Chat Lock */}
            <View style={s.sectionCard}>
              {/* Encryption */}
              <Pressable
                style={s.rowItem}
                onPress={() => {
                  void Haptics.selectionAsync();
                  showDialog(
                    'Encryption Verification',
                    'Messages and calls are end-to-end encrypted. No one outside of this chat, not even ButterflyAI, can read or listen to them.'
                  );
                }}
              >
                <Ionicons name="lock-closed-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Encryption</Text>
                  <Text style={s.rowSubtitle}>
                    Messages and calls are end-to-end encrypted. Tap to verify.
                  </Text>
                </View>
              </Pressable>

              {/* Disappearing messages */}
              <Pressable
                style={s.rowItem}
                onPress={() => {
                  void Haptics.selectionAsync();
                  showDialog(
                    'Disappearing Messages',
                    'Choose a timer for messages to disappear from this chat after being sent.',
                    [
                      { text: '24 Hours', onPress: () => setDisappearingMessages('24 hours') },
                      { text: '7 Days', onPress: () => setDisappearingMessages('7 days') },
                      { text: '90 Days', onPress: () => setDisappearingMessages('90 days') },
                      { text: 'Off', style: 'cancel', onPress: () => setDisappearingMessages('Off') },
                    ]
                  );
                }}
              >
                <Ionicons name="time-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Disappearing messages</Text>
                  <Text style={s.rowSubtitle}>{disappearingMessages}</Text>
                </View>
              </Pressable>

              {/* Chat lock */}
              <View style={s.rowItem}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Chat lock</Text>
                  <Text style={s.rowSubtitle}>
                    Lock and hide this chat on this device.
                  </Text>
                </View>
                <Switch
                  value={isChatLocked}
                  onValueChange={(val) => {
                    setIsChatLocked(val);
                    void Haptics.selectionAsync();
                  }}
                  trackColor={{ false: '#233138', true: '#00a884' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Advanced chat privacy */}
              <Pressable
                style={[s.rowItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  showDialog('Advanced Chat Privacy', 'Advanced privacy controls are disabled.');
                }}
              >
                <Ionicons name="shield-outline" size={22} color="#8696a0" style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>Advanced chat privacy</Text>
                  <Text style={s.rowSubtitle}>Off</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Media & Docs Modal */}
      <GroupMediaModal
        visible={visible && mediaVisible}
        groupUuid=""
        groupName={name}
        participantUserId={participantUserId}
        onClose={() => setMediaVisible(false)}
      />

      {/* Contact Options Bottom Sheet Modal */}
      <RNModal
        visible={optionsMenuVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOptionsMenuVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setOptionsMenuVisible(false)}>
          <Pressable
            style={[s.modalSheet, { paddingBottom: bottomInset + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Contact Options</Text>
                <Text style={s.sheetSubtitle}>{name}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.sheetCloseBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setOptionsMenuVisible(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={20} color="#8696a0" />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.optionsListContainer}
            >
              {/* Share Contact */}
              <Pressable
                style={({ pressed }) => [s.optionRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  showDialog('Share Contact', `Sharing contact details for ${name}...`);
                }}
              >
                <View style={s.rowInner}>
                  <View style={s.optionIconBox}>
                    <Ionicons name="share-outline" size={20} color="#00a884" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={s.optionLabel}>Share Contact</Text>
                    <Text style={s.optionSublabel}>Send contact details to another chat</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </Pressable>

              {/* View Media, Links & Docs */}
              <Pressable
                style={({ pressed }) => [s.optionRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  setMediaVisible(true);
                }}
              >
                <View style={s.rowInner}>
                  <View style={s.optionIconBox}>
                    <Ionicons name="images-outline" size={20} color="#00a884" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={s.optionLabel}>Media, Links & Docs</Text>
                    <Text style={s.optionSublabel}>
                      {info.data ? `${info.data.mediaCount} media · ${info.data.docsCount} docs` : 'View shared photos and files'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </Pressable>

              {/* Toggle Mute Notifications */}
              <Pressable
                style={({ pressed }) => [s.optionRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  setIsMuted(!isMuted);
                }}
              >
                <View style={s.rowInner}>
                  <View style={s.optionIconBox}>
                    <Ionicons
                      name={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                      size={20}
                      color="#00a884"
                    />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={s.optionLabel}>
                      {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                    </Text>
                    <Text style={s.optionSublabel}>
                      {isMuted ? 'Notifications are currently muted' : 'Mute alerts for this chat'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </Pressable>

              {/* Verify Security Code */}
              <Pressable
                style={({ pressed }) => [s.optionRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  showDialog(
                    'Encryption Verification',
                    'Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.'
                  );
                }}
              >
                <View style={s.rowInner}>
                  <View style={s.optionIconBox}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#00a884" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={s.optionLabel}>Verify Security Code</Text>
                    <Text style={s.optionSublabel}>Confirm end-to-end encryption</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </Pressable>

              {/* Disappearing Messages */}
              <Pressable
                style={({ pressed }) => [s.optionRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  showDialog(
                    'Disappearing Messages',
                    'Choose a timer for messages to disappear from this chat after being sent.',
                    [
                      { text: '24 Hours', onPress: () => setDisappearingMessages('24 hours') },
                      { text: '7 Days', onPress: () => setDisappearingMessages('7 days') },
                      { text: '90 Days', onPress: () => setDisappearingMessages('90 days') },
                      { text: 'Off', style: 'cancel', onPress: () => setDisappearingMessages('Off') },
                    ]
                  );
                }}
              >
                <View style={s.rowInner}>
                  <View style={s.optionIconBox}>
                    <Ionicons name="time-outline" size={20} color="#00a884" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={s.optionLabel}>Disappearing Messages</Text>
                    <Text style={s.optionSublabel}>{disappearingMessages}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </Pressable>

              <View style={s.optionDivider} />

              {/* Block Contact */}
              <Pressable
                style={({ pressed }) => [s.optionRow, s.destructiveRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  showDialog(
                    'Block Contact',
                    `Are you sure you want to block ${name}? Blocked contacts will no longer be able to call you or send you messages.`,
                    [
                      { text: 'Block', style: 'destructive', onPress: () => showDialog('Blocked', `${name} has been blocked.`) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <View style={s.rowInner}>
                  <View style={[s.optionIconBox, s.destructiveIconBox]}>
                    <Ionicons name="ban-outline" size={20} color="#ef4444" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={[s.optionLabel, s.destructiveText]}>Block {name}</Text>
                    <Text style={s.destructiveSublabel}>Prevent calls and messages</Text>
                  </View>
                </View>
              </Pressable>

              {/* Report Contact */}
              <Pressable
                style={({ pressed }) => [s.optionRow, s.destructiveRow, pressed && s.optionRowPressed]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  void Haptics.selectionAsync();
                  showDialog(
                    'Report Contact',
                    `Report ${name} to VlogChat? The last 5 messages will be forwarded to support.`,
                    [
                      { text: 'Report', style: 'destructive', onPress: () => showDialog('Reported', 'Thank you. The user has been reported.') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <View style={s.rowInner}>
                  <View style={[s.optionIconBox, s.destructiveIconBox]}>
                    <Ionicons name="flag-outline" size={20} color="#ef4444" />
                  </View>
                  <View style={s.optionTextContainer}>
                    <Text style={[s.optionLabel, s.destructiveText]}>Report {name}</Text>
                    <Text style={s.destructiveSublabel}>Report spam or inappropriate content</Text>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarGradient: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  handleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  actionCard: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00a884',
  },
  sectionDivider: {
    height: 10,
    backgroundColor: COLORS.background,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowIcon: {
    marginRight: 18,
    width: 24,
    textAlign: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  rowSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    lineHeight: 18,
  },
  // Modern WhatsApp Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1f2c34',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '82%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#e9edef',
    letterSpacing: 0.2,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#8696a0',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsListContainer: {
    paddingVertical: 6,
    gap: 4,
    width: '100%',
  },
  optionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  optionRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e9edef',
  },
  optionSublabel: {
    fontSize: 12,
    color: '#8696a0',
    marginTop: 2,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
    marginHorizontal: 4,
  },
  destructiveRow: {
    paddingVertical: 12,
  },
  destructiveIconBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  destructiveText: {
    color: '#ef4444',
  },
  destructiveSublabel: {
    fontSize: 12,
    color: 'rgba(239, 68, 68, 0.7)',
    marginTop: 2,
  },
});
