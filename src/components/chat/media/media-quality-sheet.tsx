import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MediaQuality = 'STANDARD' | 'HD';

export function MediaQualitySheet({
  visible,
  currentQuality,
  onSelectQuality,
  onClose,
}: {
  visible: boolean;
  currentQuality: MediaQuality;
  onSelectQuality: (quality: MediaQuality) => void;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  function animateClose(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateClose()}>
      <View className="flex-1 justify-end">
        <Animated.View
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', opacity: backdropOpacity }}
        >
          <Pressable className="flex-1" onPress={() => animateClose()} />
        </Animated.View>

        <Animated.View
          className="rounded-t-3xl bg-[#1c1c1c] pb-8 pt-3"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          {/* Handle bar */}
          <View className="items-center pb-3">
            <View className="h-1 w-10 rounded-full bg-white/25" />
          </View>

          <Text className="px-6 pb-2 text-[17px] font-bold text-white">Media quality</Text>
          <Text className="px-6 pb-4 text-[13px] text-white/50">
            HD media is clearer. Standard media uses less storage space and sends faster.
          </Text>

          {/* Options */}
          <View className="mx-4 overflow-hidden rounded-2xl bg-white/5">
            <Pressable
              onPress={() => {
                onSelectQuality('STANDARD');
                animateClose();
              }}
              className="flex-row items-center justify-between px-5 py-4 active:bg-white/10"
              style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-semibold text-white">Standard quality</Text>
                <Text className="mt-0.5 text-[12px] text-white/45">
                  Faster upload and smaller file size
                </Text>
              </View>
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{
                  borderWidth: currentQuality === 'STANDARD' ? 0 : 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  backgroundColor: currentQuality === 'STANDARD' ? '#60a5fa' : 'transparent',
                }}
              >
                {currentQuality === 'STANDARD' ? (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                ) : null}
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                onSelectQuality('HD');
                animateClose();
              }}
              className="flex-row items-center justify-between px-5 py-4 active:bg-white/10"
            >
              <View className="flex-1 pr-4">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] font-semibold text-white">HD quality</Text>
                  <View className="rounded bg-[#60a5fa]/20 px-1.5 py-0.5">
                    <Text className="text-[10px] font-bold text-[#60a5fa]">HD</Text>
                  </View>
                </View>
                <Text className="mt-0.5 text-[12px] text-white/45">
                  Higher resolution, clearer detail
                </Text>
              </View>
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{
                  borderWidth: currentQuality === 'HD' ? 0 : 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  backgroundColor: currentQuality === 'HD' ? '#60a5fa' : 'transparent',
                }}
              >
                {currentQuality === 'HD' ? (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                ) : null}
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
