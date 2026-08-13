import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type CustomToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Active track color. Defaults to #bdbdbd (COLORS.buttonPrimary). */
  activeColor?: string;
  /** Inactive track color. Defaults to rgba(255,255,255,0.1). */
  inactiveColor?: string;
  /** Thumb color. Defaults to #ffffff. */
  thumbColor?: string;
  /** Disabled state. */
  disabled?: boolean;
};

const TRACK_W = 46;
const TRACK_H = 26;
const THUMB_SIZE = 20;
const THUMB_MARGIN = 3;
const TRAVEL = TRACK_W - THUMB_SIZE - THUMB_MARGIN * 2;

export function CustomToggle({
  value,
  onValueChange,
  activeColor = '#bdbdbd',
  inactiveColor = 'rgba(255,255,255,0.1)',
  thumbColor = '#ffffff',
  disabled = false,
}: CustomToggleProps) {
  // ── Animations ──
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      damping: 15,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [value, progress]);

  function handlePress() {
    if (disabled) return;

    // Squish animation on press
    Animated.sequence([
      Animated.timing(scaleX, {
        toValue: 1.15,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(scaleX, {
        toValue: 1,
        useNativeDriver: false,
        damping: 12,
        stiffness: 200,
      }),
    ]).start();

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }

  // ── Interpolations ──
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_MARGIN, THUMB_MARGIN + TRAVEL],
  });

  const trackBg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  const trackBorderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', activeColor],
  });

  return (
    <Pressable onPress={handlePress} disabled={disabled} hitSlop={6}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBg,
            borderColor: trackBorderColor,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [
                { translateX },
                { scaleX },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },

});
