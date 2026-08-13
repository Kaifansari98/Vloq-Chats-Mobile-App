import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'vloq_noise_reduction';

/**
 * Manages noise reduction preference for voice recording.
 * The setting is persisted in AsyncStorage so it survives app restarts.
 * Defaults to enabled (true).
 */
export function useNoiseReduction() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) setEnabled(val === 'true');
      setLoaded(true);
    });
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    void AsyncStorage.setItem(STORAGE_KEY, String(next));
  }

  return { enabled, toggle, loaded };
}
