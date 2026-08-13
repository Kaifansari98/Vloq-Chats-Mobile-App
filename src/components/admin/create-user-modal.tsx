import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCreateUser } from '@/hooks/use-organization-members';

type CreateUserModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CreateUserModal({ visible, onClose }: CreateUserModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  const createUserMutation = useCreateUser();

  function handleReset() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('MEMBER');
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter full name of the user.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      Alert.alert('Invalid Password', 'Password must be at least 4 characters long.');
      return;
    }

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createUserMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'User Created 🎉',
        `Successfully registered ${name.trim()} (${email.trim()}). They can now log in to Vloq Chats.`,
        [
          {
            text: 'OK',
            onPress: handleClose,
          },
        ]
      );
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Failed to Create User',
        err?.response?.data?.message || err?.message || 'Could not register user. Please try again.'
      );
    }
  }

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[s.container, { paddingTop: topInset }]}>
        <StatusBar barStyle="light-content" backgroundColor="#111111" translucent />

        <SafeAreaView style={{ flex: 1 }}>
          {/* Header Bar */}
          <View style={s.header}>
            <Pressable onPress={handleClose} hitSlop={12} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>
            <View style={s.headerTitleBox}>
              <Text style={s.headerTitle}>Create New User</Text>
              <Text style={s.headerSubtitle}>Admin Portal</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Hero Banner Card */}
              <View style={s.heroCard}>
                <LinearGradient
                  colors={['#3a3d3c', '#242625']}
                  style={s.heroIconBox}
                >
                  <Ionicons name="person-add-outline" size={26} color="#ffffff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.heroTitle}>New Team Member</Text>
                  <Text style={s.heroSubtitle}>
                    Register a new user to join your Vloq workspace.
                  </Text>
                </View>
              </View>

              {/* Form Card Container */}
              <View style={s.formCard}>
                {/* Full Name */}
                <View style={s.formGroup}>
                  <Text style={s.label}>FULL NAME *</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={s.formGroup}>
                  <Text style={s.label}>EMAIL ADDRESS *</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. rahul@vloq.com"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Initial Password */}
                <View style={s.formGroup}>
                  <Text style={s.label}>TEMPORARY PASSWORD *</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="Set initial password"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Role Selector */}
                <View style={{ marginTop: 4 }}>
                  <Text style={s.label}>USER ROLE</Text>
                  <View style={s.roleSelector}>
                    <Pressable
                      onPress={() => setRole('MEMBER')}
                      style={[s.roleOption, role === 'MEMBER' && s.roleOptionActive]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={role === 'MEMBER' ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                      />
                      <Text style={[s.roleText, role === 'MEMBER' && s.roleTextActive]}>
                        Member
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setRole('ADMIN')}
                      style={[s.roleOption, role === 'ADMIN' && s.roleOptionActive]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={role === 'ADMIN' ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                      />
                      <Text style={[s.roleText, role === 'ADMIN' && s.roleTextActive]}>
                        Admin
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={createUserMutation.isPending}
                style={s.submitContainer}
              >
                <LinearGradient
                  colors={['#3a3d3c', '#242625']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitGradient}
                >
                  {createUserMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                      <Text style={s.submitBtnText}>Create User Account</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  roleOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  roleTextActive: {
    color: '#ffffff',
  },
  submitContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
