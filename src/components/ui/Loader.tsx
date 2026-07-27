import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

type SpinnerProps = Omit<React.ComponentProps<typeof Feather>, 'name' | 'style'> & {
  className?: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Spinner({ size = 16, color = '#ffffff', style, className, ...props }: SpinnerProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[{ transform: [{ rotate }] }, style]} className={className}>
      <Feather name="loader" size={size} color={color} {...props} />
    </Animated.View>
  );
}

export function SpinnerCustom() {
  return (
    <View className="flex-row items-center gap-4">
      <Spinner size={14} />
    </View>
  );
}


export const Loader = Spinner;
