import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';

export type WelcomeSlide = {
  id: string;
  image: ImageSourcePropType;
};

type WelcomeScreenBackgroundProps = {
  slides: WelcomeSlide[];
  onIndexChange: (index: number) => void;
};

export function WelcomeScreenBackground({
  slides,
  onIndexChange,
}: WelcomeScreenBackgroundProps) {
  const { height, width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [secondaryIndex, setSecondaryIndex] = useState(
    slides.length > 1 ? 1 : 0
  );
  const [activeLayer, setActiveLayer] = useState<'primary' | 'secondary'>(
    'primary'
  );
  const primaryOpacity = useRef(new Animated.Value(1)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const primaryZIndex = activeLayer === 'secondary' ? 2 : 1;
  const secondaryZIndex = activeLayer === 'primary' ? 2 : 1;

  useEffect(() => {
    onIndexChange(currentIndex);
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const followingIndex = (currentIndex + 1) % slides.length;

      if (activeLayer === 'primary') {
        setSecondaryIndex(followingIndex);
        secondaryOpacity.setValue(0);

        Animated.timing(secondaryOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) {
            return;
          }

          primaryOpacity.setValue(0);
          setActiveLayer('secondary');
          setPrimaryIndex(followingIndex);
          setCurrentIndex(followingIndex);
        });
      } else {
        setPrimaryIndex(followingIndex);
        primaryOpacity.setValue(0);

        Animated.timing(primaryOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) {
            return;
          }

          secondaryOpacity.setValue(0);
          setActiveLayer('primary');
          setSecondaryIndex(followingIndex);
          setCurrentIndex(followingIndex);
        });
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [
    activeLayer,
    currentIndex,
    onIndexChange,
    primaryOpacity,
    secondaryOpacity,
    slides.length,
  ]);

  return (
    <View style={{ width, height }}>
      <Animated.View
        style={{
          position: 'absolute',
          inset: 0,
          opacity: primaryOpacity,
          zIndex: primaryZIndex,
        }}
      >
        <Image
          source={slides[primaryIndex]?.image}
          contentFit="cover"
          transition={0}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          inset: 0,
          opacity: secondaryOpacity,
          zIndex: secondaryZIndex,
        }}
      >
        <Image
          source={slides[secondaryIndex]?.image}
          contentFit="cover"
          transition={0}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}
