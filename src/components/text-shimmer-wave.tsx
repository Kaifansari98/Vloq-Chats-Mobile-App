import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type TextShimmerWaveProps = {
  text: string;
  duration?: number;
  spread?: number;
  yDistance?: number;
  scaleDistance?: number;
  rotateYDistance?: number;
  baseColor?: string;
  peakColor?: string;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700';
};

export function TextShimmerWave({
  text,
  duration = 1,
  spread = 1,
  yDistance = -2,
  scaleDistance = 1.15,
  rotateYDistance = 12,
  baseColor = 'rgba(255,255,255,0.4)',
  peakColor = '#ffffff',
  fontSize = 13,
  fontWeight = '500',
}: TextShimmerWaveProps) {
  return (
    <View style={styles.row}>
      {text.split('').map((char, index) => (
        <ShimmerChar
          // eslint-disable-next-line react/no-array-index-key
          key={`${char}-${index}`}
          char={char}
          index={index}
          total={text.length}
          duration={duration}
          spread={spread}
          yDistance={yDistance}
          scaleDistance={scaleDistance}
          rotateYDistance={rotateYDistance}
          baseColor={baseColor}
          peakColor={peakColor}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      ))}
    </View>
  );
}

function ShimmerChar({
  char,
  index,
  total,
  duration,
  spread,
  yDistance,
  scaleDistance,
  rotateYDistance,
  baseColor,
  peakColor,
  fontSize,
  fontWeight,
}: {
  char: string;
  index: number;
  total: number;
  duration: number;
  spread: number;
  yDistance: number;
  scaleDistance: number;
  rotateYDistance: number;
  baseColor: string;
  peakColor: string;
  fontSize: number;
  fontWeight: TextShimmerWaveProps['fontWeight'];
}) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const legDuration = (duration * 1000) / 2;
    const startDelay = (index * duration * 1000 * (1 / spread)) / total;
    const repeatDelay = (total * 50) / spread;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: legDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: legDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.delay(repeatDelay),
      ])
    );

    const timeoutId = setTimeout(() => loop.start(), startDelay);

    return () => {
      clearTimeout(timeoutId);
      loop.stop();
    };
  }, [value, index, total, duration, spread]);

  const translateY = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0, yDistance],
  });
  const scale = value.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleDistance],
  });
  const rotateY = value.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotateYDistance}deg`],
  });
  const color = value.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, peakColor],
  });

  return (
    <Animated.Text
      style={[
        styles.char,
        {
          fontSize,
          fontWeight,
          color,
          transform: [
            { perspective: 300 },
            { translateY },
            { scale },
            { rotateY },
          ],
        },
      ]}
    >
      {char === ' ' ? ' ' : char}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  char: {
    includeFontPadding: false,
  },
});
