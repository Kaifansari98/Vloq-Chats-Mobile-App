import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '@/constants/theme';

export default function SettingsScreen() {
  async function triggerTestNotification() {
    try {
      // 1. Request permissions
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

      // 2. Create a high-priority "Messages" channel (WhatsApp-style)
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

      // 3. Schedule WhatsApp-style notification (fires in 2 seconds)
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
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Tester</Text>
        <Text style={styles.cardDesc}>
          Firebase setup ke bina notifications test karne ke liye niche click karein aur app ko background mein bhej dein.
        </Text>
        
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}
          onPress={() => void triggerTestNotification()}
        >
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </Pressable>
      </View>
      
      <Text style={styles.footer}>Vloq Chats v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background ?? '#111111',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
});
