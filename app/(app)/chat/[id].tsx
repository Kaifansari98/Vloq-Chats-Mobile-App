import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Platform,
  Animated,
  Modal,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { Loader } from '@/components/ui/Loader';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { TypingDots } from '@/components/typing-dots';
import { AttachmentSheet, type PickedAttachment } from '@/components/chat/attachment-sheet';
import { VoiceRecorderBar, type RecordedVoiceFile } from '@/components/chat/voice-recorder';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { COLORS } from '@/constants/theme';
import { formatDateDivider, formatFileSize, getInitials } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { useChatSocketState } from '@/hooks/use-chat-socket';
import {
  useDirectMessages,
  useSendDirectMessage,
  useUploadDirectMessage,
  useMarkDirectChatRead,
  useEditDirectMessage,
  useRequestTranscription,
} from '@/hooks/use-direct-messages';
import {
  useGroupMessages,
  useSendGroupMessage,
  useUploadGroupMessage,
  useEditGroupMessage,
} from '@/hooks/use-group-messages';
import type { DirectMessage, MessageAttachment } from '@/hooks/use-direct-messages';
import { MessageActionsSheet } from '@/components/chat/message-actions';
import { ForwardPicker } from '@/components/chat/forward-picker';
import { PinnedBanner } from '@/components/chat/pinned-banner';
import { MediaGallery } from '@/components/chat/media-gallery';
import { MediaPreviewScreen } from '@/components/chat/media/media-preview-screen';
import { usePinnedMessage } from '@/hooks/use-pinned-messages';
import {
  getMessagePreview as getMessagePreviewLabel,
  getPreviewFromAttachmentType,
  resolveAttachmentType,
} from '@/lib/message-preview';
import { AIReplySuggestionsRow } from '@/components/chat/ai-reply-suggestions';
import { AISummaryModal } from '@/components/chat/ai-summary-modal';
import { GroupInfoModal } from '@/components/chat/group-info-modal';
import {
  useAIChatSummary,
  useAITranslation,
  useAIGrammarFix,
  useAIVoiceSummary,
} from '@/hooks/use-ai-features';
import type { ChatSummaryResult } from '@/lib/ai';

const TYPING_STOP_DELAY = 2000;

type RenderRow =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; message: DirectMessage }
  | { kind: 'typing'; key: string };

function formatBubbleTime(dateString: string): string {
  return format(new Date(dateString), 'h:mm a');
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: '#ef4444',
  doc: '#3b82f6',
  docx: '#3b82f6',
  xls: '#22c55e',
  xlsx: '#22c55e',
  ppt: '#f97316',
  pptx: '#f97316',
  zip: '#a855f7',
  rar: '#a855f7',
};

function getFileExtension(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : 'file';
}

function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension] ?? 'rgba(255,255,255,0.25)';
}

function isPdfMimeType(mimeType: string | null | undefined): boolean {
  return mimeType === 'application/pdf';
}

function buildPdfPageHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; height: 100%; }
    canvas { width: 100%; height: 100%; object-fit: cover; display: block; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    function base64ToBytes(base64) {
      var raw = atob(base64);
      var arr = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }
    pdfjsLib.getDocument({ data: base64ToBytes("${base64}") }).promise
      .then(function (pdf) { return pdf.getPage(1); })
      .then(function (page) {
        var canvas = document.getElementById('c');
        var viewport = page.getViewport({ scale: 2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');
        return page.render({ canvasContext: ctx, viewport: viewport }).promise;
      })
      .catch(function () {
        document.body.innerHTML = '';
      });
  </script>
</body>
</html>`;
}

const pdfBase64Cache = new Map<string, string>();
const pdfBase64Promises = new Map<string, Promise<string | null>>();

function getPdfBase64(url: string): Promise<string | null> {
  const cached = pdfBase64Cache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pdfBase64Promises.get(url);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const localUri = `${FileSystem.cacheDirectory}pdf-preview-${encodeURIComponent(url).replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        await FileSystem.downloadAsync(url, localUri);
      }
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
      pdfBase64Cache.set(url, base64);
      return base64;
    } catch (error) {
      console.error('Failed to load PDF for preview', error);
      return null;
    } finally {
      pdfBase64Promises.delete(url);
    }
  })();

  pdfBase64Promises.set(url, promise);
  return promise;
}

function PdfPreview({ uri }: { uri: string }) {
  const [base64, setBase64] = useState<string | null>(pdfBase64Cache.get(uri) ?? null);

  useEffect(() => {
    if (base64) return;
    let cancelled = false;
    void getPdfBase64(uri).then((result) => {
      if (!cancelled) setBase64(result);
    });
    return () => {
      cancelled = true;
    };
  }, [uri, base64]);

  if (!base64) {
    return (
      <View className="flex-1 items-center justify-center bg-white/5">
        <Loader size={20} color="rgba(255,255,255,0.4)" />
      </View>
    );
  }

  return (
    <WebView
      source={{ html: buildPdfPageHtml(base64) }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      pointerEvents="none"
      javaScriptEnabled
      originWhitelist={['*']}
    />
  );
}

function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

const AUDIO_BAR_COUNT = 48;
const AUDIO_BAR_MIN_WIDTH = 2;
const AUDIO_BAR_MAX_WIDTH = 3;
const AUDIO_BAR_GAP = 1.5;

function generateAudioBars(seed: number, count: number): number[] {
  let state = seed || 1;
  const rand = () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return Math.abs(state % 1000) / 1000;
  };

  return Array.from({ length: count }, (_, index) => {
    const envelope = Math.sin((index / Math.max(1, count - 1)) * Math.PI);
    return 0.12 + envelope * 0.55 + rand() * 0.33;
  });
}

function TranscriptionSection({ attachment }: { attachment: MessageAttachment }) {
  const [expanded, setExpanded] = useState(true);
  const requestTranscription = useRequestTranscription();
  const voiceSummaryMutation = useAIVoiceSummary();
  const [voiceSummary, setVoiceSummary] = useState<string | null>(null);

  const status = attachment.transcriptionStatus ?? (attachment.transcription ? 'COMPLETED' : 'NOT_REQUESTED');
  const transcriptionText = attachment.transcription;

  // Automatically request transcription for voice messages that haven't been transcribed yet
  useEffect(() => {
    if (
      !transcriptionText &&
      status === 'NOT_REQUESTED' &&
      !requestTranscription.isPending &&
      !requestTranscription.isSuccess &&
      !requestTranscription.isError
    ) {
      requestTranscription.mutate(attachment.uuid);
    }
  }, [attachment.uuid, status, transcriptionText, requestTranscription]);

  // Generate AI Voice Summary if transcript is long enough
  useEffect(() => {
    if (
      transcriptionText &&
      transcriptionText.length > 25 &&
      !voiceSummary &&
      !voiceSummaryMutation.isPending &&
      !voiceSummaryMutation.isSuccess
    ) {
      voiceSummaryMutation.mutate(transcriptionText, {
        onSuccess: (res) => setVoiceSummary(res),
      });
    }
  }, [transcriptionText, voiceSummary, voiceSummaryMutation]);

  if (status === 'PENDING' || status === 'PROCESSING' || requestTranscription.isPending) {
    return (
      <View className="mt-2 flex-row items-center gap-1.5 border-t border-white/10 pt-1.5">
        <Loader size={12} color="rgba(255,255,255,0.7)" />
        <Text className="text-[11px] italic text-white/70">Transcribing voice message...</Text>
      </View>
    );
  }

  if (status === 'COMPLETED' && transcriptionText) {
    return (
      <View className="mt-2 border-t border-white/10 pt-1.5">
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="flex-row items-center justify-between py-0.5"
          hitSlop={4}
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="sparkles" size={12} color="#60a5fa" />
            <Text className="text-[11px] font-semibold text-blue-400">
              Transcript
            </Text>
            {attachment.transcriptionLanguage ? (
              <View className="ml-1 rounded bg-white/15 px-1 py-0.2">
                <Text className="text-[9px] uppercase font-bold text-white/80">
                  {attachment.transcriptionLanguage}
                </Text>
              </View>
            ) : null}
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>
        {expanded ? (
          <View className="mt-1">
            <Text className="text-[12px] leading-4 text-white/90">
              {transcriptionText}
            </Text>
            {voiceSummary ? (
              <View className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="sparkles" size={11} color="#60a5fa" />
                  <Text className="text-[10px] font-bold uppercase text-blue-400">
                    AI Voice Summary
                  </Text>
                </View>
                <Text className="mt-0.5 text-[11px] leading-4 text-white/85">
                  {voiceSummary}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (status === 'FAILED' || requestTranscription.isError) {
    return (
      <View className="mt-2 flex-row items-center justify-between border-t border-white/10 pt-1.5">
        <Text className="text-[11px] text-red-400">Transcription failed</Text>
        <Pressable
          onPress={() => requestTranscription.mutate(attachment.uuid)}
          className="flex-row items-center gap-1 rounded bg-white/10 px-1.5 py-0.5"
          hitSlop={4}
        >
          <Ionicons name="refresh" size={10} color="#ffffff" />
          <Text className="text-[10px] font-medium text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

function AudioMessageBubble({
  attachment,
  isOwn,
  senderName,
  senderProfilePicUrl,
  createdAt,
  deliveryStatus,
  isPeerOnline,
}: {
  attachment: MessageAttachment;
  isOwn: boolean;
  senderName: string;
  senderProfilePicUrl?: string | null;
  createdAt: string;
  deliveryStatus: DirectMessage['status'];
  isPeerOnline?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const scrubberX = useRef(new Animated.Value(0)).current;
  const barCount = useMemo(() => {
    if (!waveformWidth) return AUDIO_BAR_COUNT;
    const capacity = Math.floor((waveformWidth + AUDIO_BAR_GAP) / (AUDIO_BAR_MIN_WIDTH + AUDIO_BAR_GAP));
    return Math.max(18, Math.min(AUDIO_BAR_COUNT, capacity));
  }, [waveformWidth]);
  const barWidth = useMemo(() => {
    if (!waveformWidth) return AUDIO_BAR_MAX_WIDTH;
    const totalGapWidth = Math.max(0, barCount - 1) * AUDIO_BAR_GAP;
    return Math.min(
      AUDIO_BAR_MAX_WIDTH,
      Math.max(AUDIO_BAR_MIN_WIDTH, (waveformWidth - totalGapWidth) / Math.max(1, barCount)),
    );
  }, [barCount, waveformWidth]);
  const bars = useMemo(() => {
    const seed =
      attachment.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      (attachment.sizeBytes % 99991);
    return generateAudioBars(seed, barCount);
  }, [attachment.name, attachment.sizeBytes, barCount]);

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) {
        void player.seekTo(0);
      }
      player.play();
    }
  }

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const activeBars = Math.floor(progress * bars.length);
  const bubbleWidth =
    status.duration > 0
      ? Math.min(screenWidth * 0.75, Math.max(240, Math.round(180 + status.duration * 14)))
      : Math.min(screenWidth * 0.72, 260);
  const timeLabel = formatBubbleTime(createdAt);
  const avatar = (
    <View className="relative">
      <Avatar name={senderName} url={senderProfilePicUrl} size={40} />
      <View
        className="absolute -bottom-0.5 -right-0.5 h-4 w-4 items-center justify-center rounded-full"
        style={{ backgroundColor: '#34d399', borderWidth: 2, borderColor: '#1f1f1f' }}
      >
        <Ionicons name="mic" size={8} color="#ffffff" />
      </View>
    </View>
  );

  function seekTo(locationX: number) {
    if (!status.duration || status.duration <= 0 || !waveformWidth) return;
    const ratio = Math.max(0, Math.min(1, locationX / waveformWidth));
    void player.seekTo(ratio * status.duration);
  }

  useEffect(() => {
    const targetX = waveformWidth * Math.min(1, Math.max(0, progress));
    Animated.timing(scrubberX, {
      toValue: targetX,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, scrubberX, waveformWidth]);

  return (
    <View
      className={`mb-1.5 flex-row items-center gap-2.5 px-3 py-2.5 ${isOwn
        ? 'rounded-2xl rounded-tr-sm bg-bubbleSent'
        : 'rounded-2xl rounded-tl-sm bg-bubbleReceived'
        }`}
      style={{
        width: bubbleWidth,
      }}
    >
      {isOwn ? avatar : null}

      <Pressable
        onPress={toggle}
        className="h-8 w-8 items-center justify-center rounded-full bg-white/15"
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={15}
          color="#ffffff"
          style={!status.playing ? { marginLeft: 1 } : undefined}
        />
      </Pressable>

      <View
        className="min-w-0 flex-1"
        style={{
          paddingLeft: isOwn ? 2 : 0,
          paddingRight: isOwn ? 0 : 6,
        }}
      >
        <Pressable
          onPress={(event) => seekTo(event.nativeEvent.locationX)}
          onLayout={(event) => setWaveformWidth(event.nativeEvent.layout.width)}
          className="relative h-8 justify-end"
        >
          <View className="h-8 flex-row items-end">
            {bars.map((height, index) => {
              const isActive = index < activeBars;
              const isPlayhead = status.playing && index === activeBars && index < bars.length;
              const barHeight = Math.round(Math.max(4, height * 24));

              return (
                <View
                  key={`${attachment.uuid}-${index}`}
                  style={{
                    width: barWidth,
                    height: barHeight,
                    borderRadius: 9999,
                    marginRight: index === bars.length - 1 ? 0 : AUDIO_BAR_GAP,
                    backgroundColor: isPlayhead
                      ? '#ffffff'
                      : isActive
                        ? 'rgba(255,255,255,0.92)'
                        : 'rgba(255,255,255,0.26)',
                  }}
                />
              );
            })}
          </View>

          {status.duration > 0 ? (
            <Animated.View
              pointerEvents="none"
              className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-white"
              style={{
                transform: [{ translateX: scrubberX }],
                left: 0,
                marginTop: -5,
                marginLeft: -5,
              }}
            />
          ) : null}
        </Pressable>

        <View className="mt-1 flex-row items-center justify-between px-0.5">
          <Text className="text-[10px] font-medium tabular-nums text-white/60">
            {formatAudioDuration(status.currentTime || status.duration)}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[10px] tabular-nums text-white/40">{timeLabel}</Text>
            {isOwn ? (
              <Ionicons
                name={deliveryStatus === 'read' ? 'checkmark-done' : (deliveryStatus === 'sent' && isPeerOnline) ? 'checkmark-done' : 'checkmark'}
                size={13}
                color={deliveryStatus === 'read' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
              />
            ) : null}
            <Pressable
              onPress={() => void Linking.openURL(attachment.url)}
              hitSlop={6}
              className="h-5 w-5 items-center justify-center rounded-full"
            >
              <Ionicons name="download-outline" size={13} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </View>
        </View>

        <TranscriptionSection attachment={attachment} />
      </View>

      {!isOwn ? avatar : null}
    </View>
  );
}

const IMAGE_GRID_SIZE = 236;
const IMAGE_GRID_GAP = 2;

function ImageGrid({
  attachments,
  onPressImage,
}: {
  attachments: MessageAttachment[];
  onPressImage: (index: number) => void;
}) {
  const count = attachments.length;

  if (count === 1) {
    return (
      <Pressable onPress={() => onPressImage(0)}>
        <Image
          source={{ uri: attachments[0].url }}
          className="mb-1.5 h-48 w-56 rounded-lg"
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  if (count === 2) {
    return (
      <View
        className="mb-1.5 flex-row overflow-hidden rounded-lg"
        style={{ width: IMAGE_GRID_SIZE, height: IMAGE_GRID_SIZE * 0.62, gap: IMAGE_GRID_GAP }}
      >
        {attachments.map((attachment, index) => (
          <Pressable
            key={attachment.uuid}
            onPress={() => onPressImage(index)}
            style={{ flex: 1, height: '100%' }}
          >
            <Image
              source={{ uri: attachment.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>
    );
  }

  if (count === 3) {
    const [first, second, third] = attachments;
    return (
      <View
        className="mb-1.5 flex-row overflow-hidden rounded-lg"
        style={{ width: IMAGE_GRID_SIZE, height: IMAGE_GRID_SIZE * 0.75, gap: IMAGE_GRID_GAP }}
      >
        <Pressable onPress={() => onPressImage(0)} style={{ width: IMAGE_GRID_SIZE * 0.58, height: '100%' }}>
          <Image
            source={{ uri: first.url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </Pressable>
        <View style={{ flex: 1, gap: IMAGE_GRID_GAP }}>
          <Pressable onPress={() => onPressImage(1)} style={{ flex: 1, width: '100%' }}>
            <Image
              source={{ uri: second.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable onPress={() => onPressImage(2)} style={{ flex: 1, width: '100%' }}>
            <Image
              source={{ uri: third.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Pressable>
        </View>
      </View>
    );
  }

  const visible = attachments.slice(0, 4);
  const extraCount = count - 4;

  return (
    <View
      className="mb-1.5 overflow-hidden rounded-lg"
      style={{ width: IMAGE_GRID_SIZE, gap: IMAGE_GRID_GAP }}
    >
      <View style={{ flexDirection: 'row', gap: IMAGE_GRID_GAP, height: IMAGE_GRID_SIZE * 0.49 }}>
        {visible.slice(0, 2).map((attachment, index) => (
          <Pressable
            key={attachment.uuid}
            onPress={() => onPressImage(index)}
            style={{ flex: 1, height: '100%' }}
          >
            <Image
              source={{ uri: attachment.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: IMAGE_GRID_GAP, height: IMAGE_GRID_SIZE * 0.49 }}>
        {visible.slice(2, 4).map((attachment, index) => {
          const isLastTile = index === 1;
          return (
            <Pressable
              key={attachment.uuid}
              onPress={() => onPressImage(index + 2)}
              style={{ flex: 1, height: '100%', position: 'relative' }}
            >
              <Image
                source={{ uri: attachment.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {isLastTile && extraCount > 0 ? (
                <View className="absolute inset-0 items-center justify-center bg-black/45">
                  <Text className="text-[22px] font-bold text-white">+{extraCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ImageViewerCaption({ message }: { message: DirectMessage | null }) {
  return (
    <>
      <View className="absolute bottom-3 left-3 rounded bg-black/50 px-1.5 py-0.5">
        <Text className="text-[11px] font-semibold text-white">HD</Text>
      </View>
      {message ? (
        <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded bg-black/50 px-1.5 py-0.5">
          <Text className="text-[11px] text-white">{formatBubbleTime(message.createdAt)}</Text>
          {message.isOwnMessage ? (
            <Ionicons
              name={message.status === 'read' ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={message.status === 'read' ? '#60a5fa' : '#ffffff'}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function ImageViewerModal({
  visible,
  attachments,
  senderName,
  message,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  attachments: MessageAttachment[];
  senderName: string;
  message: DirectMessage | null;
  initialIndex: number;
  onClose: () => void;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MessageAttachment>>(null);
  const itemHeight = screenHeight * 0.72;
  const translateX = useRef(new Animated.Value(screenWidth)).current;

  useEffect(() => {
    if (visible) {
      translateX.setValue(screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenWidth, translateX]);

  function animateClose() {
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  function onGestureEvent(event: PanGestureHandlerGestureEvent) {
    translateX.setValue(Math.max(0, event.nativeEvent.translationX));
  }

  function onHandlerStateChange(event: PanGestureHandlerStateChangeEvent) {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      if (translationX > screenWidth * 0.3 || velocityX > 800) {
        animateClose();
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
      }
    }
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-1000, 15]}
        failOffsetY={[-20, 20]}
      >
        <Animated.View className="flex-1 bg-black" style={{ transform: [{ translateX }] }}>
          {visible && attachments.length === 1 ? (
            <View className="flex-1 items-center justify-center">
              <View style={{ width: screenWidth, height: screenHeight * 0.85 }}>
                <Image
                  source={{ uri: attachments[0].url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
                <ImageViewerCaption message={message} />
              </View>
            </View>
          ) : visible ? (
            <FlatList
              ref={listRef}
              data={attachments}
              keyExtractor={(item) => item.uuid}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: itemHeight + 4,
                offset: (itemHeight + 4) * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={{ width: screenWidth, height: itemHeight, marginBottom: 4 }}>
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <ImageViewerCaption message={message} />
                </View>
              )}
            />
          ) : null}

          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.45)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }}
            pointerEvents="box-none"
          >
            <View className="flex-row items-center gap-3 px-3 pb-3">
              <Pressable
                onPress={animateClose}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
              >
                <Ionicons name="chevron-back" size={24} color="#ffffff" />
              </Pressable>
              <View className="flex-1 items-center">
                <Text className="text-[16px] font-semibold text-white">{senderName}</Text>
                <Text className="text-[12px] text-white/60">
                  {attachments.length} {attachments.length === 1 ? 'Photo' : 'Photos'}
                </Text>
              </View>
              <View className="h-9 w-9" />
            </View>
          </LinearGradient>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

function buildRows(messages: DirectMessage[]): RenderRow[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const rows: RenderRow[] = [];
  let lastDayKey: string | null = null;

  for (const message of sorted) {
    const dayKey = message.createdAt.slice(0, 10);
    if (dayKey !== lastDayKey) {
      rows.push({
        kind: 'divider',
        key: `divider-${dayKey}`,
        label: formatDateDivider(message.createdAt),
      });
      lastDayKey = dayKey;
    }
    rows.push({ kind: 'message', key: message.uuid, message });
  }

  return rows;
}

const SWIPE_REPLY_TRIGGER = 56;
const SWIPE_REPLY_MAX = 76;

function MessageBubble({
  message,
  isOwn,
  senderProfilePicUrl,
  showSenderName,
  topGapClassName,
  onReply,
  onMessageAction,
  messagesByUuid,
  onOpenImageViewer,
  onJumpToMessage,
  isHighlighted,
  isPeerOnline,
  translatedText,
}: {
  message: DirectMessage;
  isOwn: boolean;
  senderProfilePicUrl?: string | null;
  showSenderName: boolean;
  topGapClassName: string;
  onReply: (message: DirectMessage) => void;
  onMessageAction: (message: DirectMessage) => void;
  messagesByUuid: Map<string, DirectMessage>;
  onOpenImageViewer: (message: DirectMessage, index: number) => void;
  onJumpToMessage: (messageUuid: string) => void;
  isHighlighted: boolean;
  isPeerOnline?: boolean;
  translatedText?: string | null;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggeredHapticRef = useRef(false);
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.setValue(1);
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: 900,
        delay: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isHighlighted, highlightOpacity]);

  function getSwipeDistance(translationX: number) {
    if (isOwn) {
      return Math.max(-SWIPE_REPLY_MAX, Math.min(0, translationX));
    }

    return Math.max(0, Math.min(SWIPE_REPLY_MAX, translationX));
  }

  function onGestureEvent(event: PanGestureHandlerGestureEvent) {
    const { translationX } = event.nativeEvent;
    const swipeDistance = getSwipeDistance(translationX);
    const absoluteDistance = Math.abs(swipeDistance);

    translateX.setValue(swipeDistance);

    if (
      absoluteDistance > SWIPE_REPLY_TRIGGER &&
      !hasTriggeredHapticRef.current
    ) {
      hasTriggeredHapticRef.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (
      absoluteDistance <= SWIPE_REPLY_TRIGGER &&
      hasTriggeredHapticRef.current
    ) {
      hasTriggeredHapticRef.current = false;
    }
  }

  function onHandlerStateChange(
    event: PanGestureHandlerStateChangeEvent
  ) {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;

      const shouldReply = isOwn
        ? translationX < -SWIPE_REPLY_TRIGGER
        : translationX > SWIPE_REPLY_TRIGGER;

      if (shouldReply) {
        onReply(message);
      }

      hasTriggeredHapticRef.current = false;

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }).start();
    }
  }

  const iconOpacity = translateX.interpolate({
    inputRange: isOwn
      ? [-SWIPE_REPLY_TRIGGER, 0]
      : [0, SWIPE_REPLY_TRIGGER],
    outputRange: isOwn ? [1, 0] : [0, 1],
    extrapolate: 'clamp',
  });

  const imageAttachments = message.attachments.filter((attachment) => {
    const t = resolveAttachmentType(attachment);
    return t === 'image' || t === 'gif';
  });
  const audioAttachment = message.attachments.find((attachment) => {
    const t = resolveAttachmentType(attachment);
    return t === 'voice' || t === 'audio';
  });
  const fileAttachment = message.attachments.find((attachment) => {
    const t = resolveAttachmentType(attachment);
    return t !== 'image' && t !== 'gif' && t !== 'voice' && t !== 'audio';
  });
  const isAudioOnlyMessage =
    Boolean(audioAttachment) &&
    imageAttachments.length === 0 &&
    !fileAttachment &&
    !message.content &&
    !message.replyTo;

  const replyPreview = (() => {
    if (!message.replyTo) return null;
    if (message.replyTo.attachmentType === 'IMAGE') {
      const originalImages =
        messagesByUuid
          .get(message.replyTo.uuid)
          ?.attachments.filter((attachment) => attachment.attachmentType === 'IMAGE') ?? [];
      return {
        icon: 'camera' as const,
        label: originalImages.length > 1 ? `${originalImages.length} photos` : 'Photo',
        fileColor: null,
        thumbnailUri: originalImages[0]?.url ?? null,
        thumbnailKind: 'image' as const,
        isAudio: false,
      };
    }
    if (message.replyTo.attachmentType === 'VIDEO') {
      return {
        icon: 'videocam' as const,
        label: 'Video',
        fileColor: null,
        thumbnailUri: null,
        thumbnailKind: null,
        isAudio: false,
      };
    }
    if (message.replyTo.attachmentType === 'FILE') {
      const originalFile = messagesByUuid
        .get(message.replyTo.uuid)
        ?.attachments.find(
          (attachment) =>
            attachment.attachmentType !== 'IMAGE' && !attachment.mimeType?.startsWith('audio/')
        );
      // Backward-compat: a FILE might actually be an image/audio based on MIME
      if (originalFile) {
        const resolvedType = resolveAttachmentType(originalFile);
        if (resolvedType === 'image') {
          return {
            icon: 'camera' as const,
            label: 'Photo',
            fileColor: null,
            thumbnailUri: originalFile.url ?? null,
            thumbnailKind: 'image' as const,
            isAudio: false,
          };
        }
        if (resolvedType === 'voice' || resolvedType === 'audio') {
          return {
            icon: 'mic' as const,
            label: resolvedType === 'voice' ? 'Voice' : 'Audio',
            fileColor: null,
            thumbnailUri: null,
            thumbnailKind: null,
            isAudio: true,
          };
        }
      }
      return {
        icon: 'document-text' as const,
        label: originalFile?.name ?? 'Document',
        fileColor: originalFile ? getFileColor(getFileExtension(originalFile.name)) : null,
        thumbnailUri:
          originalFile && isPdfMimeType(originalFile.mimeType) ? originalFile.url : null,
        thumbnailKind: 'pdf' as const,
        isAudio: false,
      };
    }
    if (message.replyTo.attachmentType === 'AUDIO') {
      return {
        icon: 'mic' as const,
        label: 'Voice',
        fileColor: null,
        thumbnailUri: null,
        thumbnailKind: null,
        isAudio: true,
      };
    }
    return {
      icon: null,
      label: message.replyTo.content ?? 'Message',
      fileColor: null,
      thumbnailUri: null,
      thumbnailKind: null,
      isAudio: false,
    };
  })();

  return (
    <View className={`${topGapClassName} flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={isOwn ? [-12, 1000] : [-1000, 12]}
        failOffsetY={[-8, 8]}
      >
        <Animated.View
          className="relative max-w-[82%]"
          style={{ transform: [{ translateX }] }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              ...(isOwn ? { right: -34 } : { left: -34 }),
              top: '50%',
              marginTop: -13,
              opacity: iconOpacity,
              transform: [{ scale: iconOpacity }],
            }}
          >
            <View className="h-6.5 w-6.5 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="arrow-undo" size={14} color="rgba(255,255,255,0.75)" />
            </View>
          </Animated.View>

          <Pressable onLongPress={() => onMessageAction(message)}>
            <View
              className={
                isAudioOnlyMessage
                  ? 'overflow-visible'
                  : `overflow-hidden rounded-2xl px-3 py-2 ${isOwn ? 'rounded-tr-sm bg-bubbleSent' : 'rounded-tl-sm bg-bubbleReceived'
                  }`
              }
              style={
                message.replyTo && !isAudioOnlyMessage
                  ? { minWidth: Math.min(screenWidth * 0.56, 280) }
                  : undefined
              }
            >
              {!isAudioOnlyMessage ? (
                <Animated.View
                  pointerEvents="none"
                  className="absolute inset-0 bg-white"
                  style={{ opacity: highlightOpacity }}
                />
              ) : null}

              {showSenderName ? (
                <Text className="mb-1 text-[11px] font-semibold text-blue-400">
                  {message.senderName}
                </Text>
              ) : null}

              {message.replyTo ? (
                <Pressable
                  onPress={() => onJumpToMessage(message.replyTo!.uuid)}
                  className={`-mx-2 mb-2 flex-row items-stretch overflow-hidden rounded-2xl ${showSenderName ? 'mt-0' : '-mt-1'
                    }`}
                  style={{
                    backgroundColor: isOwn ? '#2f2f2f' : '#3a3a3a',
                  }}
                >
                  <View
                    className={`w-1.5 self-stretch ${isOwn ? 'bg-[#ff5c8a]' : 'bg-blue-400'}`}
                  />
                  <View
                    className="min-w-0 grow shrink justify-center px-3 py-2.5"
                  >
                    <Text
                      numberOfLines={1}
                      className={`font-semibold ${replyPreview?.isAudio
                        ? 'text-[13px] text-[#ff7d9e]'
                        : isOwn
                          ? 'text-[13px] text-[#ff7d9e]'
                          : 'text-[13px] text-blue-400'
                        }`}
                    >
                      {message.replyTo.senderName}
                    </Text>
                    {replyPreview?.icon ? (
                      <View className="mt-1 flex-row items-center gap-1.5">
                        {replyPreview.fileColor ? (
                          <View
                            className="h-4 w-4 items-center justify-center rounded"
                            style={{ backgroundColor: replyPreview.fileColor }}
                          >
                            <Ionicons name={replyPreview.icon} size={10} color="#ffffff" />
                          </View>
                        ) : (
                          <Ionicons
                            name={replyPreview.icon}
                            size={replyPreview?.isAudio ? 18 : 11}
                            color={replyPreview?.isAudio ? 'rgba(255,255,255,0.85)' : isOwn ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.5)'}
                          />
                        )}
                        <Text
                          numberOfLines={1}
                          className={`flex-1 ${replyPreview?.isAudio
                            ? 'text-[12px] text-white/70'
                            : isOwn
                              ? 'text-[12px] text-white/70'
                              : 'text-[12px] text-white/70'
                            }`}
                        >
                          {replyPreview.label}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        numberOfLines={2}
                        className="mt-1 text-[12px] text-white/70"
                      >
                        {replyPreview?.label}
                      </Text>
                    )}
                  </View>
                  {replyPreview?.thumbnailUri ? (
                    <View
                      className="h-14 w-14 shrink-0 overflow-hidden"
                      style={{ backgroundColor: '#1f1f1f' }}
                    >
                      {replyPreview.thumbnailKind === 'pdf' ? (
                        <PdfPreview uri={replyPreview.thumbnailUri} />
                      ) : (
                        <ExpoImage
                          source={replyPreview.thumbnailUri}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      )}
                    </View>
                  ) : null}
                </Pressable>
              ) : null}

              {imageAttachments.length > 0 ? (
                <ImageGrid
                  attachments={imageAttachments}
                  onPressImage={(index) => onOpenImageViewer(message, index)}
                />
              ) : null}

              {fileAttachment ? (
                <Pressable
                  onPress={() => void Linking.openURL(fileAttachment.url)}
                  className={`mb-1.5 w-[230px] overflow-hidden rounded-xl ${isOwn ? 'bg-white/10' : 'bg-white/8'
                    }`}
                >
                  {isPdfMimeType(fileAttachment.mimeType) ? (
                    <View className="h-[150px] w-full bg-white">
                      <PdfPreview uri={fileAttachment.url} />
                      <LinearGradient
                        colors={['transparent', isOwn ? '#333333' : '#242625']}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36 }}
                        pointerEvents="none"
                      />
                    </View>
                  ) : null}
                  <View className="flex-row items-center gap-3 p-2.5">
                    <View
                      className="h-11 w-11 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: getFileColor(getFileExtension(fileAttachment.name)),
                      }}
                    >
                      <Ionicons name="document-text" size={22} color="#ffffff" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        numberOfLines={2}
                        className={`text-[14px] font-medium ${isOwn ? 'text-white' : 'text-white/95'}`}
                      >
                        {fileAttachment.name}
                      </Text>
                      <Text className="mt-0.5 text-[11px] uppercase text-white/50">
                        {formatFileSize(fileAttachment.sizeBytes)} ·{' '}
                        {getFileExtension(fileAttachment.name)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ) : null}

              {audioAttachment ? (
                <AudioMessageBubble
                  attachment={audioAttachment}
                  isOwn={isOwn}
                  senderName={message.senderName}
                  senderProfilePicUrl={senderProfilePicUrl}
                  createdAt={message.createdAt}
                  deliveryStatus={message.status}
                  isPeerOnline={isPeerOnline}
                />
              ) : null}

              {message.content ? (
                <Text className={`text-[15px] ${isOwn ? 'text-white' : 'text-white/95'}`}>
                  {message.content}
                </Text>
              ) : null}

              {translatedText ? (
                <View className="mt-2 border-t border-white/10 pt-1.5">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="language" size={12} color="#60a5fa" />
                    <Text className="text-[11px] font-semibold text-blue-400">AI Translation</Text>
                  </View>
                  <Text className="mt-0.5 text-[13px] leading-4 text-white/90">{translatedText}</Text>
                </View>
              ) : null}

              {!isAudioOnlyMessage ? (
                <View className="mt-1 flex-row items-center justify-end gap-1">
                  {message.isEdited ? (
                    <Text className={`text-[10px] italic ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                      edited
                    </Text>
                  ) : null}
                  <Text className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
                    {formatBubbleTime(message.createdAt)}
                  </Text>
                  {isOwn ? (
                    <Ionicons
                      name={message.status === 'read' ? 'checkmark-done' : (message.status === 'sent' && isPeerOnline) ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={message.status === 'read' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    isGroup: string;
    memberId: string;
    name: string;
    profilePicUrl: string;
  }>();

  const isGroup = params.isGroup === '1';
  const memberId = Number(params.memberId);
  const conversationUuid = params.id;
  const name = params.name || 'Chat';
  const profilePicUrl = params.profilePicUrl || null;

  const insets = useSafeAreaInsets();
  const { typingUserIds, groupTypingUsers, onlineUserIds } = useChatSocketState();
  const listRef = useRef<FlatList<RenderRow>>(null);
  const textInputRef = useRef<TextInput>(null);
  const isPickingDocumentRef = useRef(false);

  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [pickedAttachment, setPickedAttachment] = useState<PickedAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<PickedAttachment | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAttachSheetVisible, setIsAttachSheetVisible] = useState(false);
  const [voiceRecorderPhase, setVoiceRecorderPhase] = useState<'idle' | 'recording' | 'paused'>(
    'idle'
  );
  const [imageViewer, setImageViewer] = useState<{ message: DirectMessage; index: number } | null>(
    null
  );
  const [highlightedMessageUuid, setHighlightedMessageUuid] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── New feature state ──
  const [actionMessage, setActionMessage] = useState<DirectMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [isForwardPickerVisible, setIsForwardPickerVisible] = useState(false);
  const [isMediaGalleryVisible, setIsMediaGalleryVisible] = useState(false);
  const { pinned, pinMessage, unpinMessage } = usePinnedMessage(conversationUuid);

  // ── AI Features state & handlers ──
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<ChatSummaryResult | null>(null);
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});

  const summaryMutation = useAIChatSummary();
  const translateMutation = useAITranslation();
  const grammarFixMutation = useAIGrammarFix();

  function handleGenerateSummary() {
    setIsSummaryModalVisible(true);
    summaryMutation.mutate(messages, {
      onSuccess: (result) => setSummaryData(result),
    });
  }

  function handleTranslateAction() {
    if (!actionMessage?.content?.trim()) return;
    const msgUuid = actionMessage.uuid;
    translateMutation.mutate(
      { text: actionMessage.content },
      {
        onSuccess: (res) => {
          setTranslationsMap((prev) => ({
            ...prev,
            [msgUuid]: res.translatedText,
          }));
        },
      }
    );
  }

  function handleGrammarFix() {
    if (!content.trim() || grammarFixMutation.isPending) return;
    grammarFixMutation.mutate(content, {
      onSuccess: (res) => {
        setContent(res.correctedText);
      },
    });
  }

  const isInitialLoadRef = useRef(true);
  const showScrollToBottomRef = useRef(false);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'android' ? 250 : 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const directMessagesQuery = useDirectMessages(isGroup ? undefined : memberId);
  const groupMessagesQuery = useGroupMessages(isGroup ? conversationUuid : undefined);

  const sendDirect = useSendDirectMessage(isGroup ? undefined : memberId);
  const uploadDirect = useUploadDirectMessage(isGroup ? undefined : memberId);
  const editDirect = useEditDirectMessage(isGroup ? undefined : memberId);
  const sendGroup = useSendGroupMessage(isGroup ? conversationUuid : undefined);
  const uploadGroup = useUploadGroupMessage(isGroup ? conversationUuid : undefined);
  const editGroup = useEditGroupMessage(isGroup ? conversationUuid : undefined);
  const markDirectRead = useMarkDirectChatRead();
  const requestTranscription = useRequestTranscription();

  const messages = (isGroup ? groupMessagesQuery.data : directMessagesQuery.data)?.data ?? [];
  const isLoading = isGroup ? groupMessagesQuery.isLoading : directMessagesQuery.isLoading;
  const isSending = isGroup ? sendGroup.isPending : sendDirect.isPending;
  const isUploading = isGroup ? uploadGroup.isPending : uploadDirect.isPending;

  useEffect(() => {
    if (!isGroup && memberId > 0 && messages.length > 0) {
      markDirectRead.mutate(memberId);
    }
  }, [isGroup, memberId, messages.length]);

  const messagesByUuid = useMemo(
    () => new Map(messages.map((message) => [message.uuid, message])),
    [messages]
  );

  const groupTypers = useMemo(
    () =>
      isGroup
        ? groupTypingUsers.filter((u) => u.conversationUuid === conversationUuid)
        : [],
    [isGroup, groupTypingUsers, conversationUuid]
  );

  const isPeerTyping = isGroup ? groupTypers.length > 0 : typingUserIds.includes(memberId);

  const typingActorLabel = isGroup ? (groupTypers[0]?.userName ?? name) : name;

  const isOnline = !isGroup && onlineUserIds.includes(memberId);

  const rows = useMemo(() => {
    const base = buildRows(messages);
    if (isPeerTyping) {
      base.push({ kind: 'typing', key: 'typing-indicator' });
    }
    return base;
  }, [messages, isPeerTyping]);

  useEffect(() => {
    if (!isGroup && Number.isFinite(memberId)) {
      markDirectRead.mutate(memberId);
    }
    // Only re-run when switching to a different conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroup, memberId]);

  // Mark incoming messages as read in real-time when active on this screen
  const lastMessage = messages[messages.length - 1];
  const lastMessageUuid = lastMessage?.uuid;
  const lastMessageSenderId = lastMessage?.senderId;

  useEffect(() => {
    if (
      !isGroup &&
      Number.isFinite(memberId) &&
      lastMessage &&
      !lastMessage.isOwnMessage &&
      lastMessage.status !== 'read'
    ) {
      markDirectRead.mutate(memberId);
    }
  }, [lastMessageUuid, lastMessageSenderId, memberId, isGroup, lastMessage?.status]);

  useEffect(() => {
    if (rows.length === 0) return;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      scrollToBottom(false);
      const settleTimeout = setTimeout(() => {
        scrollToBottom(false);
      }, 200);
      return () => clearTimeout(settleTimeout);
    }

    if (!showScrollToBottomRef.current || lastMessage?.isOwnMessage) {
      scrollToBottom(true);
    }
  }, [rows.length, lastMessage?.uuid, lastMessage?.isOwnMessage, scrollToBottom]);

  function emitTyping(isTyping: boolean) {
    const socket = getSocket();
    if (!socket) return;

    if (isGroup) {
      socket.emit('group_message:typing', { conversationUuid, isTyping });
    } else {
      socket.emit('direct_message:typing', {
        participantUserId: memberId,
        isTyping,
      });
    }
  }

  function stopTyping() {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    emitTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  function handleContentChange(text: string) {
    setContent(text);

    if (text.trim().length === 0) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY);
  }

  useEffect(() => {
    return () => {
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickImage(source: 'library' | 'camera') {
    const permission =
      source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }

    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 1.0,
        })
        : await ImagePicker.launchCameraAsync({
          mediaTypes: ['images', 'videos'],
          quality: 1.0,
        });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video/');

    setPreviewAttachment({
      uri: asset.uri,
      name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
      type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      kind: isVideo ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      sizeBytes: asset.fileSize,
      quality: 'STANDARD',
    });
  }

  function handlePreviewSend(att: PickedAttachment, caption: string) {
    setPreviewAttachment(null);
    stopTyping();

    const uploadMutation = isGroup ? uploadGroup : uploadDirect;
    uploadMutation.mutate(
      {
        content: caption,
        files: [att],
        replyToMessageUuid: replyTo?.uuid,
      },
      {
        onSuccess: () => {
          setContent('');
          setPickedAttachment(null);
          setReplyTo(null);
          scrollToBottom(true);
        },
        onError: (error) => {
          console.error('Failed to send media', error);
          Alert.alert('Upload failed', 'Could not upload media. Please try again.');
        },
      }
    );
  }

  async function pickDocument() {
    if (isPickingDocumentRef.current) return;
    isPickingDocumentRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setPickedAttachment({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
        kind: 'file',
      });
    } finally {
      isPickingDocumentRef.current = false;
    }
  }

  function handleReply(message: DirectMessage) {
    setReplyTo(message);
    textInputRef.current?.focus();
  }

  function handleOpenImageViewer(message: DirectMessage, index: number) {
    setImageViewer({ message, index });
  }

  // ── New feature handlers ──
  function handleMessageAction(message: DirectMessage) {
    setActionMessage(message);
    setIsActionSheetVisible(true);
  }

  function handleActionReply() {
    if (actionMessage) handleReply(actionMessage);
  }

  function handleActionEdit() {
    if (actionMessage) {
      setEditingMessage(actionMessage);
      setContent(actionMessage.content ?? '');
      textInputRef.current?.focus();
    }
  }

  function handleCancelEdit() {
    setEditingMessage(null);
    setContent('');
  }

  function handleActionForward() {
    setIsForwardPickerVisible(true);
  }

  function handleActionPin() {
    if (actionMessage) void pinMessage(actionMessage);
  }

  function handleActionUnpin() {
    void unpinMessage();
  }

  function handlePinnedBannerPress() {
    if (pinned) handleJumpToMessage(pinned.messageUuid);
  }

  function handleMediaGalleryImage(attachments: MessageAttachment[], index: number) {
    // Create a fake message to display in the viewer
    if (attachments.length > 0) {
      setIsMediaGalleryVisible(false);
      const fakeMsg: DirectMessage = {
        uuid: 'gallery-view',
        conversationUuid,
        senderId: 0,
        senderUuid: '',
        senderName: name,
        content: null,
        type: 'IMAGE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOwnMessage: false,
        status: 'read',
        attachments,
      };
      setImageViewer({ message: fakeMsg, index });
    }
  }

  function handleJumpToMessage(messageUuid: string) {
    const index = rows.findIndex(
      (row) => row.kind === 'message' && row.message.uuid === messageUuid
    );
    if (index === -1) return;

    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });

    setHighlightedMessageUuid(messageUuid);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageUuid(null), 1200);
  }

  function handleAttachPress() {
    setIsAttachSheetVisible(true);
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed && !pickedAttachment) return;

    stopTyping();

    if (editingMessage) {
      const editMutation = isGroup ? editGroup : editDirect;
      editMutation.mutate({ messageUuid: editingMessage.uuid, content: trimmed });
      setEditingMessage(null);
      setContent('');
      return;
    }

    if (pickedAttachment) {
      const uploadMutation = isGroup ? uploadGroup : uploadDirect;
      uploadMutation.mutate(
        {
          content: trimmed,
          files: [pickedAttachment],
          replyToMessageUuid: replyTo?.uuid,
        },
        {
          onSuccess: () => {
            setContent('');
            setPickedAttachment(null);
            setReplyTo(null);
            scrollToBottom(true);
          },
        }
      );
      return;
    }

    const sendMutation = isGroup ? sendGroup : sendDirect;
    sendMutation.mutate(
      { content: trimmed, replyToMessageUuid: replyTo?.uuid },
      {
        onSuccess: () => {
          setContent('');
          setReplyTo(null);
          scrollToBottom(true);
        },
      }
    );
  }

  function handleVoiceMessageComplete(file: RecordedVoiceFile) {
    stopTyping();
    const uploadMutation = isGroup ? uploadGroup : uploadDirect;
    uploadMutation.mutate(
      {
        content: '',
        files: [file],
        replyToMessageUuid: replyTo?.uuid,
      },
      {
        onSuccess: (responseData) => {
          setReplyTo(null);
          scrollToBottom(true);

          // Auto-trigger transcription for the uploaded audio attachment if present
          const audioAttachment = responseData?.data?.attachments?.find((a) => {
            const t = resolveAttachmentType(a);
            return t === 'voice' || t === 'audio';
          });
          if (audioAttachment?.uuid) {
            requestTranscription.mutate(audioAttachment.uuid);
          }
        },
        onError: (error) => {
          const responseData = (error as { response?: { data?: unknown } })?.response?.data;
          console.error('Failed to send voice message', file, JSON.stringify(responseData));
          const message =
            (responseData as { message?: string | string[] })?.message ??
            'Could not send the voice message. Please try again.';
          Alert.alert('Voice message failed', Array.isArray(message) ? message.join('\n') : message);
        },
      }
    );
  }

  const hasContent = content.trim().length > 0 || Boolean(pickedAttachment);
  const canSend = hasContent && !isSending && !isUploading;
  const replyToIsOwn = replyTo?.isOwnMessage ?? false;
  const replyPreviewText = (() => {
    if (!replyTo) return '';
    return getMessagePreviewLabel(replyTo);
  })();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-white/8 px-3 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>

        <Pressable
          onPress={() => isGroup && setIsGroupInfoVisible(true)}
          className="flex-row items-center flex-1 gap-3 min-w-0"
        >
          <View>
            <Avatar name={name} url={profilePicUrl} size={38} isGroup={isGroup} />
            {isOnline ? (
              <View className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
            ) : null}
          </View>

          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[16px] font-semibold text-white">
              {name}
            </Text>
            {isPeerTyping ? (
              <Text className="text-[12px] text-button-primary">typing...</Text>
            ) : isGroup ? (
              <Text numberOfLines={1} className="text-[12px] text-white/40">
                tap for group info
              </Text>
            ) : (
              <Text numberOfLines={1} className="text-[12px] text-white/40">
                {isOnline ? 'Active now' : 'Offline'}
              </Text>
            )}
          </View>
        </Pressable>

        <View className="flex-row items-center gap-1">
          <Pressable
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons name="videocam-outline" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>

          <View className="relative z-50">
            <Pressable
              onPress={() => setIsMenuOpen(true)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
            >
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>

            <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
              <Pressable className="flex-1" onPress={() => setIsMenuOpen(false)}>
                <View
                  className="absolute right-3 rounded-xl bg-[#2a2a2a] py-2 w-48 border border-white/10"
                  style={{ top: insets.top + 45, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 }}
                >
                  {isGroup && (
                    <Pressable
                      className="px-4 py-3 active:bg-white/5 flex-row items-center gap-3"
                      onPress={() => {
                        setIsMenuOpen(false);
                        setIsGroupInfoVisible(true);
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={18} color="#60a5fa" />
                      <Text className="text-blue-400 font-semibold text-[15px]">Group Info</Text>
                    </Pressable>
                  )}
                  <Pressable
                    className="px-4 py-3 active:bg-white/5 flex-row items-center gap-3"
                    onPress={() => {
                      setIsMenuOpen(false);
                      handleGenerateSummary();
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color="#60a5fa" />
                    <Text className="text-blue-400 font-semibold text-[15px]">AI Chat Summary</Text>
                  </Pressable>
                  <Pressable
                    className="px-4 py-3 active:bg-white/5 flex-row items-center gap-3"
                    onPress={() => {
                      setIsMenuOpen(false);
                      Alert.alert('Search', 'Search feature coming soon!');
                    }}
                  >
                    <Ionicons name="search" size={18} color="#ffffff" />
                    <Text className="text-white text-[15px]">Search</Text>
                  </Pressable>
                  <Pressable
                    className="px-4 py-3 active:bg-white/5 flex-row items-center gap-3"
                    onPress={() => {
                      setIsMenuOpen(false);
                      Alert.alert(
                        'Clear Chat',
                        'Are you sure you want to clear this chat?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Clear', style: 'destructive', onPress: () => console.log('Clear chat triggered') }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                    <Text className="text-red-400 text-[15px]">Clear Chat</Text>
                  </Pressable>
                  <Pressable
                    className="px-4 py-3 active:bg-white/5 flex-row items-center gap-3"
                    onPress={() => {
                      setIsMenuOpen(false);
                      setIsMediaGalleryVisible(true);
                    }}
                  >
                    <Ionicons name="images-outline" size={18} color="#ffffff" />
                    <Text className="text-white text-[15px]">Media, links, and docs</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Modal>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
        enabled
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loader size={36} color="rgba(255,255,255,0.45)" />
          </View>
        ) : (
          <>
            <PinnedBanner
              pinned={pinned}
              onPress={handlePinnedBannerPress}
              onUnpin={handleActionUnpin}
            />
            <View className="relative flex-1 overflow-hidden">
              <Image
                source={require('../../../assets/chat-doodle-pattern.png')}
                style={{ position: 'absolute', top: 0, left: 0, width: 400, height: 700 }}
                resizeMode="cover"
              />
              <View
                pointerEvents="none"
                className="absolute inset-0 bg-black/35"
              />
              <FlatList
                ref={listRef}
                data={rows}
                keyExtractor={(row) => row.key}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingTop: 12,
                  paddingHorizontal: 8,
                  paddingBottom: 12,
                  flexGrow: 1,
                }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                onContentSizeChange={() => {
                  if (isInitialLoadRef.current || !showScrollToBottomRef.current) {
                    listRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const distanceFromBottom =
                    contentSize.height - contentOffset.y - layoutMeasurement.height;
                  const isFarFromBottom = distanceFromBottom > 150;
                  setShowScrollToBottom(isFarFromBottom);
                  showScrollToBottomRef.current = isFarFromBottom;
                }}
                scrollEventThrottle={100}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    listRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.3,
                    });
                  }, 100);
                }}
                renderItem={({ item, index }) => {
                  if (item.kind === 'divider') {
                    return (
                      <View className="my-3 items-center">
                        <View className="rounded-full bg-white/8 px-3 py-1">
                          <Text className="text-[11px] font-semibold text-white/60">
                            {item.label}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  if (item.kind === 'typing') {
                    return (
                      <View className="mb-1.5 mt-2 items-start">
                        <Text className="mb-1 px-1 text-[11px] font-medium text-white/50">
                          {typingActorLabel}
                        </Text>
                        <View className="rounded-2xl rounded-bl-sm bg-bubbleReceived px-4 py-3">
                          <TypingDots color={COLORS.buttonPrimary} />
                        </View>
                      </View>
                    );
                  }

                  const message = item.message;
                  const isOwn = message.isOwnMessage;

                  const prevRow = rows[index - 1];
                  const isSameSenderAsPrev =
                    prevRow?.kind === 'message' && prevRow.message.isOwnMessage === isOwn;
                  const topGap = isSameSenderAsPrev ? 'mt-1' : 'mt-4';

                  return (
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      senderProfilePicUrl={!isOwn && !isGroup ? profilePicUrl : null}
                      showSenderName={isGroup && !isOwn}
                      topGapClassName={topGap}
                      onReply={handleReply}
                      onMessageAction={handleMessageAction}
                      messagesByUuid={messagesByUuid}
                      onOpenImageViewer={handleOpenImageViewer}
                      onJumpToMessage={handleJumpToMessage}
                      isHighlighted={highlightedMessageUuid === message.uuid}
                      isPeerOnline={isOnline}
                      translatedText={translationsMap[message.uuid]}
                    />
                  );
                }}
              />

              {showScrollToBottom ? (
                <Pressable
                  onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                  hitSlop={8}
                  className="absolute bottom-3 right-4 h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1c1c1c]"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color="#ffffff"
                    style={{ marginTop: 1 }}
                  />
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        {replyTo ? (
          <View className="border-t border-white/12 bg-[#111111]">
            <View className="flex-row items-center px-0 py-0">
              <View
                className="mr-4 self-stretch"
                style={{
                  width: 6,
                  backgroundColor: replyToIsOwn ? '#ff5c8a' : '#4d9dff',
                }}
              />
              <View className="min-w-0 flex-1 py-3 pr-3">
                <Text
                  numberOfLines={1}
                  className="text-[15px] font-semibold"
                  style={{ color: replyToIsOwn ? '#ff7d9e' : '#4d9dff' }}
                >
                  {replyTo.senderName}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.88)' }}
                >
                  {replyPreviewText}
                </Text>
              </View>
              <Pressable
                onPress={() => setReplyTo(null)}
                hitSlop={8}
                className="mr-4 h-10 w-10 items-center justify-center rounded-full"
                style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.92)' }}
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        ) : null}

        {pickedAttachment ? (
          <View className="flex-row items-center gap-2 border-t border-white/8 bg-white/5 px-4 py-2">
            {pickedAttachment.kind === 'image' ? (
              <ExpoImage
                source={pickedAttachment.uri}
                style={{ width: 48, height: 48, borderRadius: 8 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                <Ionicons name="document-text" size={22} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            <Text numberOfLines={1} className="flex-1 text-[12px] text-white/50">
              {pickedAttachment.kind === 'image' ? 'Photo ready to send' : pickedAttachment.name}
            </Text>
            <Pressable onPress={() => setPickedAttachment(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        ) : null}

        {editingMessage ? (
          <View className="flex-row items-center border-t border-white/12 bg-[#111111] px-4 py-2.5">
            <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-[#38bdf8]/15">
              <Ionicons name="pencil" size={14} color="#38bdf8" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-semibold text-[#38bdf8]">Editing Message</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[12px] text-white/70">
                {editingMessage.content}
              </Text>
            </View>
            <Pressable
              onPress={handleCancelEdit}
              hitSlop={8}
              className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <Ionicons name="close" size={16} color="#ffffff" />
            </Pressable>
          </View>
        ) : null}

        <AIReplySuggestionsRow
          lastMessageContent={lastMessage?.content ?? null}
          senderName={name}
          onSelectSuggestion={(text) => setContent(text)}
          visible={!content.trim() && voiceRecorderPhase === 'idle'}
        />

        <View
          className="flex-row items-end gap-2 border-t border-white/15 bg-[#111111] px-3 pt-3"
          style={{
            paddingBottom: isKeyboardVisible
              ? 10
              : Math.max(insets.bottom, 10),
          }}
        >
          {voiceRecorderPhase === 'idle' ? (
            <>
              <Pressable
                onPress={handleAttachPress}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
              >
                <Ionicons name="add" size={24} color="rgba(255,255,255,0.7)" />
              </Pressable>

              <View className="min-h-[35px] max-h-28 flex-1 flex-row items-center rounded-3xl bg-white/10 px-4 py-2.5">
                {replyTo ? (
                  <View
                    className="mr-3 self-stretch rounded-full"
                    style={{
                      width: 4,
                      backgroundColor: '#d1d5db',
                    }}
                  />
                ) : null}
                {content.trim().length > 0 ? (
                  <Pressable
                    onPress={handleGrammarFix}
                    hitSlop={6}
                    className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 active:bg-blue-500/30"
                  >
                    {grammarFixMutation.isPending ? (
                      <Loader size={13} color="#60a5fa" />
                    ) : (
                      <Ionicons name="sparkles" size={14} color="#60a5fa" />
                    )}
                  </Pressable>
                ) : null}
                <TextInput
                  ref={textInputRef}
                  value={content}
                  onChangeText={handleContentChange}
                  onFocus={() => {
                    if (isInitialLoadRef.current || !showScrollToBottomRef.current) {
                      scrollToBottom(true);
                    }
                  }}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  textAlignVertical="center"
                  selectionColor="#d1d5db"
                  cursorColor="#d1d5db"
                  style={{ paddingVertical: 0 }}
                  className="flex-1 text-[15px] text-white"
                />
              </View>
            </>
          ) : null}

          {voiceRecorderPhase === 'idle' && hasContent ? (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              className={`h-10 w-10 items-center justify-center rounded-full ${canSend ? 'bg-button-primary' : 'bg-white/10'
                }`}
            >
              {isSending || isUploading ? (
                <Loader size={18} color="#ffffff" />
              ) : (
                <Ionicons
                  name={editingMessage ? "checkmark" : "send"}
                  size={editingMessage ? 20 : 17}
                  color={canSend ? COLORS.buttonPrimaryForeground : 'rgba(255,255,255,0.35)'}
                />
              )}
            </Pressable>
          ) : (
            <>
              {voiceRecorderPhase === 'idle' ? (
                <Pressable
                  onPress={() => void pickImage('camera')}
                  hitSlop={8}
                  className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
                >
                  <Ionicons name="camera-outline" size={23} color="rgba(255,255,255,0.7)" />
                </Pressable>
              ) : null}
              <VoiceRecorderBar
                onSend={handleVoiceMessageComplete}
                onPhaseChange={setVoiceRecorderPhase}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <AttachmentSheet
        visible={isAttachSheetVisible}
        onClose={() => setIsAttachSheetVisible(false)}
        onPickLibrary={() => void pickImage('library')}
        onPickCamera={() => void pickImage('camera')}
        onPickDocument={() => void pickDocument()}
        onSelectAsset={setPickedAttachment}
      />

      <ImageViewerModal
        visible={imageViewer !== null}
        attachments={
          imageViewer?.message.attachments.filter(
            (attachment) => attachment.attachmentType === 'IMAGE'
          ) ?? []
        }
        senderName={imageViewer?.message.isOwnMessage ? 'You' : (imageViewer?.message.senderName ?? '')}
        message={imageViewer?.message ?? null}
        initialIndex={imageViewer?.index ?? 0}
        onClose={() => setImageViewer(null)}
      />

      <MessageActionsSheet
        visible={isActionSheetVisible}
        message={actionMessage}
        isPinned={pinned?.messageUuid === actionMessage?.uuid}
        onClose={() => {
          setIsActionSheetVisible(false);
          setActionMessage(null);
        }}
        onReply={handleActionReply}
        onEdit={handleActionEdit}
        onForward={handleActionForward}
        onPin={handleActionPin}
        onUnpin={handleActionUnpin}
        onTranslate={handleTranslateAction}
      />

      <ForwardPicker
        visible={isForwardPickerVisible}
        message={actionMessage}
        onClose={() => {
          setIsForwardPickerVisible(false);
          setActionMessage(null);
        }}
        onForwardComplete={() => {
          Alert.alert('Forwarded', 'Message forwarded successfully!');
        }}
      />

      <MediaGallery
        visible={isMediaGalleryVisible}
        messages={messages}
        chatName={name}
        onClose={() => setIsMediaGalleryVisible(false)}
        onPressMedia={(attachment) => {
          setIsMediaGalleryVisible(false);
          const fakeMsg: DirectMessage = {
            uuid: 'gallery-view',
            conversationUuid,
            senderId: 0,
            senderUuid: '',
            senderName: name,
            content: null,
            type: 'IMAGE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOwnMessage: false,
            status: 'read',
            attachments: [attachment],
          };
          setImageViewer({ message: fakeMsg, index: 0 });
        }}
        onJumpToMessage={handleJumpToMessage}
      />

      <MediaPreviewScreen
        visible={previewAttachment !== null}
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        onSend={handlePreviewSend}
      />

      <AISummaryModal
        visible={isSummaryModalVisible}
        onClose={() => setIsSummaryModalVisible(false)}
        summary={summaryData}
        isLoading={summaryMutation.isPending}
        chatName={name}
      />

      <GroupInfoModal
        visible={isGroupInfoVisible}
        groupUuid={conversationUuid}
        groupName={name}
        onClose={() => setIsGroupInfoVisible(false)}
      />
    </View>
  );
}
