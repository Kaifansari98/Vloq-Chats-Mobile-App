import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StatusBar, View } from 'react-native';

/** Reserve only the keyboard overlap that native adjustResize has not consumed. */
export function useAndroidKeyboardInset() {
  const containerRef = useRef<View>(null);
  const [bottomInset, setBottomInset] = useState(0);
  const keyboardTopRef = useRef<number | null>(null);
  const measurementRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const measureOverlap = useCallback(() => {
    if (Platform.OS !== 'android') return;
    const measurement = ++measurementRef.current;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const keyboardTop = keyboardTopRef.current;
      if (keyboardTop === null) {
        setBottomInset(0);
        return;
      }
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        if (measurement !== measurementRef.current) return;
        // React Native Android subtracts visibleWindowFrame.top in both Paper
        // and Fabric measureInWindow. Keyboard.screenY does not subtract it.
        const screenBottom = y + (StatusBar.currentHeight ?? 0) + height;
        setBottomInset(Math.max(0, Math.min(height, screenBottom - keyboardTop)));
      });
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    keyboardTopRef.current = Keyboard.metrics()?.screenY ?? null;
    measureOverlap();
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      measureOverlap();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
      ++measurementRef.current;
      setBottomInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
      ++measurementRef.current;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [measureOverlap]);

  // Measure the outer, fixed-size container; padding changes only its children.
  // Measuring the shrinking composer would feed its own adjustment back into the inset.
  return { containerRef, bottomInset, onContainerLayout: measureOverlap };
}
