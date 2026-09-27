import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal as NativeModal, type ModalProps, View, Text, Pressable, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type DialogOptions = { cancelable?: boolean; onDismiss?: () => void; autoDismissMs?: number };
type Dialog = { title: string; message?: string; buttons: DialogButton[]; options: DialogOptions };
const queue: Dialog[] = [];
const hosts: symbol[] = [];
const listeners = new Set<() => void>();
let revision = 0;
function emit() { revision += 1; listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function useDialogState() { useSyncExternalStore(subscribe, () => revision, () => revision); }

/** Shared app confirmation/message sheet. Requests are queued so messages never overwrite each other. */
export function showDialog(title: string, message?: string, buttons?: DialogButton[], options: DialogOptions = {}) {
  Keyboard.dismiss();
  const dialogItem: Dialog = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options };
  queue.push(dialogItem);
  emit();

  if (options.autoDismissMs && options.autoDismissMs > 0) {
    setTimeout(() => {
      const index = queue.indexOf(dialogItem);
      if (index !== -1) {
        queue.splice(index, 1);
        emit();
        dialogItem.buttons[0]?.onPress?.();
      }
    }, options.autoDismissMs);
  }
}
export function dismissCurrentDialog(executeFirstButtonPress = true) {
  const dialog = queue.shift();
  if (!dialog) return;
  emit();
  if (executeFirstButtonPress) {
    dialog.buttons[0]?.onPress?.();
  }
}
function choose(dialog: Dialog, button: DialogButton) {
  if (queue[0] !== dialog) return;
  queue.shift();
  emit();
  button.onPress?.();
}
function dismiss() {
  const dialog = queue[0];
  if (!dialog) return;
  const cancel = dialog.buttons.find((button) => button.style === 'cancel');
  if (dialog.options.cancelable === false || (!cancel && !dialog.options.cancelable)) return;
  queue.shift();
  emit();
  cancel?.onPress?.();
  dialog.options.onDismiss?.();
}
function DialogSheet() {
  const insets = useSafeAreaInsets();
  const dialog = queue[0];
  if (!dialog) return null;
  const destructive = dialog.buttons.some((button) => button.style === 'destructive');
  const color = destructive ? '#ef4444' : '#bdbdbd';
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Dismiss dialog" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={styles.handle} />
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
          <View style={[styles.icon, { backgroundColor: destructive ? '#ef444426' : '#ffffff12', borderColor: destructive ? '#ef44444d' : '#ffffff26' }]}>
            <Ionicons name={destructive ? 'warning-outline' : 'information-circle-outline'} size={28} color={color} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{dialog.title}</Text>
          {!!dialog.message && <Text style={styles.message}>{String(dialog.message)}</Text>}
          <View style={[styles.actions, dialog.buttons.length > 2 && styles.stacked]}>
            {dialog.buttons.map((button, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => choose(dialog, button)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor:
                      button.style === 'cancel'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : button.style === 'destructive'
                        ? '#dc2626'
                        : '#6366f1',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.buttonText, { color: '#ffffff' }]}>{button.text}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/** Mount once at the app root. Modal surfaces below take over while visible. */
export function AppDialogHost() {
  useDialogState();
  return <NativeModal visible={queue.length > 0 && hosts.length === 0} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}><DialogSheet /></NativeModal>;
}

/** Keeps dialogs inside the topmost native modal, including on iOS. */
export function AppModal({ children, visible = true, onRequestClose, ...props }: ModalProps) {
  const [id] = useState(() => Symbol('dialog-host'));
  useDialogState();
  useEffect(() => {
    if (!visible) return;
    hosts.push(id);
    emit();
    return () => { const index = hosts.indexOf(id); if (index !== -1) hosts.splice(index, 1); emit(); };
  }, [id, visible]);
  const active = queue.length > 0 && hosts[hosts.length - 1] === id;
  return (
    <NativeModal {...props} visible={visible} onRequestClose={active ? dismiss : onRequestClose}>
      <View style={styles.container}>
        <View style={styles.container} pointerEvents={active ? 'none' : 'auto'} accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}>{children}</View>
        {active && <DialogSheet />}
      </View>
    </NativeModal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: '#000000bf', zIndex: 9999 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: '#121212', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: '#ffffff1a', padding: 24, maxHeight: '85%' },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 20 },
  content: { alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  message: { fontSize: 13, lineHeight: 20, color: '#ffffff80', textAlign: 'center', paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  stacked: { flexDirection: 'column' },
  button: { flexGrow: 1, flexBasis: 0, minHeight: 48, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
