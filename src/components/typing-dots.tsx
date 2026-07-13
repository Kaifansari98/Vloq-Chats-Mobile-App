import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type TypingDotsProps = {
  size?: number;
  color?: string;
  gap?: number;
};

// Mirrors the web app's TypingDots (chat-window.tsx): scale 0.72→1.2→0.72,
// opacity 0.45→1→0.45, 900ms, staggered 180ms per dot, 50ms repeat delay.
export function TypingDots({ size = 8, color = '#60a5fa', gap = 6 }: TypingDotsProps) {
  const values = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(value, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(50),
        ])
      )
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.row, { gap }]}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0.45, 1],
            }),
            transform: [
              {
                scale: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.72, 1.2],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
