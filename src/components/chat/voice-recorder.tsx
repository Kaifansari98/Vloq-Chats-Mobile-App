import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { COLORS } from '@/constants/theme';

const WAVEFORM_MAX_BARS = 28;

export type RecordedVoiceFile = { uri: string; name: string; type: string };

type Phase = 'idle' | 'recording' | 'paused';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceRecorderBar({
  onSend,
  onPhaseChange,
}: {
  onSend: (file: RecordedVoiceFile) => void;
  onPhaseChange: (phase: Phase) => void;
}) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 120);

  const [phase, setPhase] = useState<Phase>('idle');
  const [levels, setLevels] = useState<number[]>([]);
  const isBusyRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Request mic permission up front so the OS permission dialog never has
    // to interrupt starting a recording.
    void requestRecordingPermissionsAsync();
  }, []);

  useEffect(() => {
    onPhaseChange(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'recording' || !recorderState.isRecording) return;
    const level = recorderState.metering ?? -160;
    const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
    setLevels((prev) => {
      const next = [...prev, normalized];
      return next.length > WAVEFORM_MAX_BARS ? next.slice(next.length - WAVEFORM_MAX_BARS) : next;
    });
  }, [recorderState.metering, recorderState.isRecording, phase]);

  async function startRecording() {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone access needed',
          'Please allow microphone access to record a voice message.'
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      hasStartedRef.current = true;
      setLevels([]);
      setPhase('recording');
    } finally {
      isBusyRef.current = false;
    }
  }

  function togglePause() {
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  }

  async function sendRecording() {
    if (isBusyRef.current || !hasStartedRef.current) return;
    isBusyRef.current = true;
    try {
      hasStartedRef.current = false;
      await recorder.stop();
      const uri = recorder.uri;
      setPhase('idle');
      setLevels([]);
      if (uri) {
        onSend({ uri, name: `voice-${Date.now()}.m4a`, type: 'audio/mp4' });
      } else {
        console.error('Voice recording produced no file (recorder.uri was null)');
        Alert.alert('Recording failed', 'The voice message could not be saved. Please try again.');
      }
    } finally {
      isBusyRef.current = false;
    }
  }

  async function discardRecording() {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      if (hasStartedRef.current) {
        hasStartedRef.current = false;
        await recorder.stop();
      }
      setPhase('idle');
      setLevels([]);
    } finally {
      isBusyRef.current = false;
    }
  }

  if (phase === 'idle') {
    return (
      <Pressable
        onPress={() => void startRecording()}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
      >
        <Ionicons name="mic-outline" size={23} color="rgba(255,255,255,0.7)" />
      </Pressable>
    );
  }

  return (
    <View className="h-10 flex-1 flex-row items-center rounded-3xl bg-white/10 px-3">
      <Pressable
        onPress={() => void discardRecording()}
        hitSlop={8}
        className="mr-2 h-8 w-8 items-center justify-center rounded-full active:bg-white/10"
      >
        <Ionicons name="trash-outline" size={19} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <View className={`mr-2 h-2.5 w-2.5 rounded-full bg-red-500 ${phase === 'paused' ? 'opacity-40' : ''}`} />
      <Text className="mr-3 text-[13px] tabular-nums text-white/90">
        {formatDuration(recorderState.durationMillis)}
      </Text>

      <View className="mr-2 h-6 flex-1 flex-row items-center gap-[2px]">
        {levels.map((level, index) => (
          <View
            key={index}
            style={{
              width: 3,
              borderRadius: 2,
              height: Math.max(3, level * 22),
              backgroundColor: 'rgba(255,255,255,0.5)',
            }}
          />
        ))}
      </View>

      <Pressable
        onPress={togglePause}
        hitSlop={8}
        className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-red-500"
      >
        <Ionicons name={phase === 'recording' ? 'pause' : 'mic'} size={16} color="#ffffff" />
      </Pressable>

      <Pressable
        onPress={() => void sendRecording()}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-button-primary"
      >
        <Ionicons name="send" size={15} color={COLORS.buttonPrimaryForeground} />
      </Pressable>
    </View>
  );
}
