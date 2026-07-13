import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { StatusBar } from 'expo-status-bar';
import { useLogin } from '@/hooks/use-login';
import {
  WelcomeScreenBackground,
  type WelcomeSlide,
} from '@/components/welcome-screen-background';
import { COLORS } from '@/constants/theme';

const BACKGROUND_SLIDES: WelcomeSlide[] = [
  { id: '1', image: require('../../assets/welcome-screen/image2.jpg') },
  { id: '2', image: require('../../assets/welcome-screen/image3.jpg') },
  { id: '3', image: require('../../assets/welcome-screen/image1.jpg') },
  { id: '4', image: require('../../assets/welcome-screen/image4.jpg') },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const loginMutation = useLogin();

  function extractError(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      const msg = data?.message;
      if (typeof msg === 'string') return msg;
      if (!err.response) return 'Cannot reach server. Is the backend running?';
    }
    return 'Login failed';
  }

  const errorMessage = loginMutation.error ? extractError(loginMutation.error) : null;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loginMutation.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
      provider: 'EMAIL',
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <WelcomeScreenBackground slides={BACKGROUND_SLIDES} onIndexChange={() => {}} />
      </View>

      <LinearGradient
        colors={[
          `rgba(${COLORS.backgroundRgb}, 0.55)`,
          `rgba(${COLORS.backgroundRgb}, 0.7)`,
          `rgba(${COLORS.backgroundRgb}, 0.88)`,
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/butterflyai_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headingContainer}>
              <Text style={styles.heading}>Login to your account</Text>
              <Text style={styles.subheading}>
                Enter your email below to login to your account
              </Text>
            </View>

            <View style={styles.card}>
              <View>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="m@example.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                  style={[styles.textInput, focusedField === 'email' && styles.inputFocused]}
                />
              </View>

              <View style={styles.fieldGap}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View
                  style={[
                    styles.passwordRow,
                    focusedField === 'password' && styles.inputFocused,
                  ]}
                >
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="password"
                    importantForAutofill="no"
                    contextMenuHidden={false}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                    style={styles.passwordInput}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={10}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="rgba(255,255,255,0.65)"
                    />
                  </Pressable>
                </View>
              </View>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                className={`mt-6 h-12 w-full flex-row items-center justify-center rounded-xl shadow-lg shadow-black/40 active:bg-zinc-200 ${
                  canSubmit ? 'bg-white' : 'bg-white/35 shadow-none'
                }`}
              >
                {loginMutation.isPending ? (
                  <View className="mr-2">
                    <ActivityIndicator color="#0f172a" size="small" />
                  </View>
                ) : null}
                <Text
                  className={`text-[15px] font-bold tracking-tight ${
                    canSubmit ? 'text-slate-900' : 'text-slate-900/55'
                  }`}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 28,
  },
  logo: {
    width: 140,
    height: 36,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  fieldGap: {
    marginTop: 20,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  inputFocused: {
    borderColor: 'rgba(255,255,255,0.6)',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 14,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#ffffff',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    marginTop: 20,
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
  },
});
