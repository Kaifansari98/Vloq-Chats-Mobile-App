import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  WelcomeScreenBackground,
  type WelcomeSlide,
} from '../src/components/welcome-screen-background';

const BACKGROUND_SLIDES: WelcomeSlide[] = [
  { id: '1', image: require('../assets/welcome-screen/image2.jpg') },
  { id: '2', image: require('../assets/welcome-screen/image3.jpg') },
  { id: '3', image: require('../assets/welcome-screen/image1.jpg') },
  { id: '4', image: require('../assets/welcome-screen/image4.jpg') },
];

const STATIC_TITLE = 'Vloq Chats';
const STATIC_DESCRIPTION =
  'Seamless, real-time communication across every stage of your project lifecycle.';

const HAS_SEEN_WELCOME_KEY = 'vloq_has_seen_welcome';

export default function WelcomeScreen() {
  const [, setActiveIndex] = useState(0);

  async function handleGetStarted() {
    await AsyncStorage.setItem(HAS_SEEN_WELCOME_KEY, 'true');
    router.replace('/(auth)/login');
  }

  return (
    <View className="flex-1 bg-black">
      <View className="absolute inset-0">
        <WelcomeScreenBackground
          slides={BACKGROUND_SLIDES}
          onIndexChange={setActiveIndex}
        />
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.8)']}
        locations={[0, 0.45, 0.72, 1]}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
        }}
        pointerEvents="none"
      />

      <View
        className="flex-1 justify-end px-7 pb-14 pt-16"
        pointerEvents="box-none"
        style={{ zIndex: 20 }}
      >
        <View pointerEvents="none">
          <Text className="text-center text-[27px] font-semibold leading-[37px] text-white">
            {STATIC_TITLE}
          </Text>

          <Text className="mt-4 text-center text-[17px] leading-7 text-white/65">
            {STATIC_DESCRIPTION}
          </Text>
        </View>

        <View className="mt-10 flex-row gap-4">
          <Pressable
            className="flex-1 rounded-[18px] bg-white py-4"
            onPress={() => void handleGetStarted()}
          >
            <Text className="text-center text-[18px] font-semibold text-black">
              Get Started
            </Text>
          </Pressable>
        </View>

        <Text className="mt-10 text-center text-[15px] text-white/35">
          {'Terms of use  |  Privacy Policy'}
        </Text>
      </View>
    </View>
  );
}
