import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { CreateUserModal } from '@/components/admin/create-user-modal';
import { CustomToggle } from '@/components/ui/CustomToggle';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Toggle Row ──────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  showDivider = true,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <View style={styles.rowIconBox}>
        <Ionicons name={icon} size={17} color="#ffffff" />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <CustomToggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

// ─── Tappable Row ────────────────────────────────────────────────────────────

function TappableRow({
  icon,
  title,
  subtitle,
  onPress,
  showDivider = true,
  destructive = false,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  showDivider?: boolean;
  destructive?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
    >
      <View style={[styles.row, showDivider && styles.rowDivider]}>
        <View style={[styles.rowIconBox, destructive && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
          <Ionicons name={icon} size={17} color={destructive ? '#f87171' : '#ffffff'} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, destructive && { color: '#f87171' }]}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        {trailing ?? (
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
        )}
      </View>
    </Pressable>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const statusBarH = insets.top || (StatusBar.currentHeight ?? 44);

  // ── Admin check ──
  const isAdmin =
    user?.userTypeCode === 'ADMIN' ||
    user?.userTypeCode === 'ORG_ADMIN' ||
    user?.userTypeCode?.toUpperCase().includes('ADMIN') ||
    (user as any)?.role === 'ADMIN';

  // ── Create User Modal ──
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  // ── Notification & Sound toggles ──
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppSound, setInAppSound] = useState(true);
  const [vibration, setVibration] = useState(true);

  // ── Privacy toggles ──
  const [readReceipts, setReadReceipts] = useState(true);
  const [appLock, setAppLock] = useState(false);

  // ── Storage toggles ──
  const [autoDownloadWifi, setAutoDownloadWifi] = useState(true);
  const [autoDownloadMobile, setAutoDownloadMobile] = useState(false);

  // ── Notification tester (preserved from original) ──
  async function triggerTestNotification() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in your phone settings.');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'New chat message notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kaif Ansari',
          subtitle: 'Vloq Chats',
          body: 'Bhai kya haal hai? Aaj raat milte hain! 🔥',
          data: { chatId: 'test-chat', senderName: 'Kaif Ansari' },
          sound: true,
          priority: 'max',
          vibrate: [0, 250, 250, 250],
          color: '#6366f1',
          categoryIdentifier: 'message',
        } as any,
        trigger: {
          type: 'timeInterval',
          seconds: 2,
        } as any,
      });

      Alert.alert(
        '✅ Notification Scheduled',
        'App ko minimize karo — 2 second mein WhatsApp jaisi notification aayegi!'
      );
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      Alert.alert('Error', String(error));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarH, height: statusBarH + 52 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* ────────── Section 1: Notifications & Sounds ────────── */}
        <SectionHeader title="NOTIFICATIONS & SOUNDS" />
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            title="Message Notifications"
            subtitle="Push alerts for new messages"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <ToggleRow
            icon="volume-medium-outline"
            title="In-App Sound"
            subtitle="Play sound when message arrives"
            value={inAppSound}
            onValueChange={setInAppSound}
          />
          <ToggleRow
            icon="phone-portrait-outline"
            title="Vibration"
            subtitle="Vibrate on new messages"
            value={vibration}
            onValueChange={setVibration}
            showDivider={false}
          />
        </View>

        {/* Notification Tester Card — same row layout as other sections */}
        <View style={[styles.card, { marginTop: 10 }]}>
          <Pressable
            onPress={() => void triggerTestNotification()}
          >
            <View style={styles.row}>
              <View style={styles.rowIconBox}>
                <Ionicons name="flask-outline" size={17} color="#ffffff" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Notification Tester</Text>
                <Text style={styles.rowSubtitle}>Tap to send a test push notification</Text>
              </View>
              <Ionicons name="paper-plane-outline" size={18} color="rgba(255,255,255,0.4)" />
            </View>
          </Pressable>
        </View>

        {/* ────────── Section 2: Privacy & Security ────────── */}
        <SectionHeader title="PRIVACY & SECURITY" />
        <View style={styles.card}>
          <ToggleRow
            icon="checkmark-done-outline"
            title="Read Receipts"
            subtitle="Show when you've read messages"
            value={readReceipts}
            onValueChange={setReadReceipts}
          />
          <TappableRow
            icon="ban-outline"
            title="Blocked Users"
            subtitle="Manage blocked contacts"
            onPress={() => Alert.alert('Blocked Users', 'Coming soon!')}
          />
          <ToggleRow
            icon="finger-print-outline"
            title="App Lock"
            subtitle="Require biometric to open app"
            value={appLock}
            onValueChange={setAppLock}
            showDivider={false}
          />
        </View>

        {/* ────────── Section 3: Chats & Storage ────────── */}
        <SectionHeader title="CHATS & STORAGE" />
        <View style={styles.card}>
          <ToggleRow
            icon="wifi-outline"
            title="Auto-Download (Wi-Fi)"
            subtitle="Download media on Wi-Fi automatically"
            value={autoDownloadWifi}
            onValueChange={setAutoDownloadWifi}
          />
          <ToggleRow
            icon="cellular-outline"
            title="Auto-Download (Mobile)"
            subtitle="Download media on mobile data"
            value={autoDownloadMobile}
            onValueChange={setAutoDownloadMobile}
          />
          <TappableRow
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={() =>
              Alert.alert(
                'Clear Cache',
                'Are you sure you want to clear cached data? This will free up storage space.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => Alert.alert('Done', 'Cache cleared successfully!'),
                  },
                ]
              )
            }
            destructive
            showDivider={false}
          />
        </View>

        {/* ────────── Section 4: Admin Tools (Admin Only) ────────── */}
        {isAdmin ? (
          <>
            <SectionHeader title="ADMIN TOOLS" />
            <View style={styles.card}>
              <TappableRow
                icon="person-add-outline"
                title="Create New User"
                subtitle="Register a new team member"
                onPress={() => setIsCreateUserOpen(true)}
                showDivider={false}
              />
            </View>
          </>
        ) : null}

        {/* ────────── Section 5: Help & About ────────── */}
        <SectionHeader title="HELP & ABOUT" />
        <View style={styles.card}>
          <TappableRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="FAQs and contact support"
            onPress={() => Alert.alert('Help & Support', 'Coming soon!')}
          />
          <TappableRow
            icon="document-text-outline"
            title="Terms & Privacy Policy"
            subtitle="Read our terms of service"
            onPress={() => Alert.alert('Terms & Privacy Policy', 'Coming soon!')}
          />
          <TappableRow
            icon="information-circle-outline"
            title="App Version"
            subtitle="Vloq Chats v1.0.0"
            onPress={() => {}}
            showDivider={false}
            trailing={<Text style={styles.versionText}>v1.0.0</Text>}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Create User Modal */}
      <CreateUserModal
        visible={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },

  // ── Row styles ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  rowSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },


  // ── Version text ──
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
