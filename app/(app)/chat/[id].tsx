import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Platform,
  Animated,
  Modal,
  useWindowDimensions,
} from 'react-native';
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
import { COLORS } from '@/constants/theme';
import { formatDateDivider, formatFileSize } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { useChatSocketState } from '@/hooks/use-chat-socket';
import {
  useDirectMessages,
  useSendDirectMessage,
  useUploadDirectMessage,
  useMarkDirectChatRead,
} from '@/hooks/use-direct-messages';
import {
  useGroupMessages,
  useSendGroupMessage,
  useUploadGroupMessage,
} from '@/hooks/use-group-messages';
import type { DirectMessage, MessageAttachment } from '@/hooks/use-direct-messages';

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
        <ActivityIndicator color="rgba(255,255,255,0.4)" size="small" />
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
  showSenderName,
  topGapClassName,
  onReply,
  messagesByUuid,
  onOpenImageViewer,
  onJumpToMessage,
  isHighlighted,
}: {
  message: DirectMessage;
  isOwn: boolean;
  showSenderName: boolean;
  topGapClassName: string;
  onReply: (message: DirectMessage) => void;
  messagesByUuid: Map<string, DirectMessage>;
  onOpenImageViewer: (message: DirectMessage, index: number) => void;
  onJumpToMessage: (messageUuid: string) => void;
  isHighlighted: boolean;
}) {
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

  function onGestureEvent(event: PanGestureHandlerGestureEvent) {
    const { translationX } = event.nativeEvent;
    translateX.setValue(Math.max(0, Math.min(translationX, SWIPE_REPLY_MAX)));

    if (translationX > SWIPE_REPLY_TRIGGER && !hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (translationX <= SWIPE_REPLY_TRIGGER && hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = false;
    }
  }

  function onHandlerStateChange(event: PanGestureHandlerStateChangeEvent) {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (event.nativeEvent.translationX > SWIPE_REPLY_TRIGGER) {
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
    inputRange: [0, SWIPE_REPLY_TRIGGER],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageAttachments = message.attachments.filter(
    (attachment) => attachment.attachmentType === 'IMAGE'
  );
  const fileAttachment = message.attachments.find(
    (attachment) =>
      attachment.attachmentType !== 'IMAGE' && !attachment.mimeType?.startsWith('audio/')
  );

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
      };
    }
    if (message.replyTo.attachmentType === 'FILE') {
      const originalFile = messagesByUuid
        .get(message.replyTo.uuid)
        ?.attachments.find(
          (attachment) =>
            attachment.attachmentType !== 'IMAGE' && !attachment.mimeType?.startsWith('audio/')
        );
      return {
        icon: 'document-text' as const,
        label: originalFile?.name ?? 'Document',
        fileColor: originalFile ? getFileColor(getFileExtension(originalFile.name)) : null,
        thumbnailUri:
          originalFile && isPdfMimeType(originalFile.mimeType) ? originalFile.url : null,
        thumbnailKind: 'pdf' as const,
      };
    }
    if (message.replyTo.attachmentType === 'AUDIO') {
      return {
        icon: 'mic' as const,
        label: 'Audio',
        fileColor: null,
        thumbnailUri: null,
        thumbnailKind: null,
      };
    }
    return {
      icon: null,
      label: message.replyTo.content ?? 'Message',
      fileColor: null,
      thumbnailUri: null,
      thumbnailKind: null,
    };
  })();

  return (
    <View className={`${topGapClassName} flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-1000, 12]}
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
              left: -34,
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

          <Pressable onLongPress={() => onReply(message)}>
            <View
              className={`overflow-hidden rounded-2xl px-3 py-2 ${
                isOwn ? 'rounded-tr-sm bg-bubbleSent' : 'rounded-tl-sm bg-bubbleReceived'
              }`}
            >
              <Animated.View
                pointerEvents="none"
                className="absolute inset-0 bg-white"
                style={{ opacity: highlightOpacity }}
              />

              {showSenderName ? (
                <Text className="mb-1 text-[11px] font-semibold text-blue-400">
                  {message.senderName}
                </Text>
              ) : null}

              {message.replyTo ? (
                <Pressable
                  onPress={() => onJumpToMessage(message.replyTo!.uuid)}
                  className={`-mx-2 mb-2 flex-row items-stretch overflow-hidden rounded-lg ${
                    showSenderName ? 'mt-0' : '-mt-1'
                  } ${isOwn ? 'bg-white/15' : 'bg-white/8'}`}
                >
                  <View className={`w-1 ${isOwn ? 'bg-white/70' : 'bg-blue-400'}`} />
                  <View className="min-w-0 grow shrink justify-center px-2 py-1.5">
                    <Text
                      numberOfLines={1}
                      className={`text-[11px] font-semibold ${
                        isOwn ? 'text-white/90' : 'text-blue-400'
                      }`}
                    >
                      {message.replyTo.senderName}
                    </Text>
                    {replyPreview?.icon ? (
                      <View className="mt-0.5 flex-row items-center gap-1.5">
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
                            size={11}
                            color={isOwn ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.5)'}
                          />
                        )}
                        <Text
                          numberOfLines={1}
                          className={`flex-1 text-[11px] ${isOwn ? 'text-white/65' : 'text-white/50'}`}
                        >
                          {replyPreview.label}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        numberOfLines={2}
                        className={`text-[11px] ${isOwn ? 'text-white/65' : 'text-white/50'}`}
                      >
                        {replyPreview?.label}
                      </Text>
                    )}
                  </View>
                  {replyPreview?.thumbnailUri ? (
                    <View className="h-14 w-14 shrink-0 overflow-hidden bg-white/10">
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
                  className={`mb-1.5 w-[230px] overflow-hidden rounded-xl ${
                    isOwn ? 'bg-white/10' : 'bg-white/8'
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

              {message.content ? (
                <Text className={`text-[15px] ${isOwn ? 'text-white' : 'text-white/95'}`}>
                  {message.content}
                </Text>
              ) : null}

              <View className="mt-1 flex-row items-center justify-end gap-1">
                <Text className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
                  {formatBubbleTime(message.createdAt)}
                </Text>
                {isOwn ? (
                  <Ionicons
                    name={message.status === 'read' ? 'checkmark-done' : 'checkmark'}
                    size={14}
                    color={message.status === 'read' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                  />
                ) : null}
              </View>
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAttachSheetVisible, setIsAttachSheetVisible] = useState(false);
  const [imageViewer, setImageViewer] = useState<{ message: DirectMessage; index: number } | null>(
    null
  );
  const [highlightedMessageUuid, setHighlightedMessageUuid] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const directMessagesQuery = useDirectMessages(isGroup ? undefined : memberId);
  const groupMessagesQuery = useGroupMessages(isGroup ? conversationUuid : undefined);

  const sendDirect = useSendDirectMessage(isGroup ? undefined : memberId);
  const uploadDirect = useUploadDirectMessage(isGroup ? undefined : memberId);
  const sendGroup = useSendGroupMessage(isGroup ? conversationUuid : undefined);
  const uploadGroup = useUploadGroupMessage(isGroup ? conversationUuid : undefined);
  const markDirectRead = useMarkDirectChatRead();

  const messages = (isGroup ? groupMessagesQuery.data : directMessagesQuery.data)?.data ?? [];
  const isLoading = isGroup ? groupMessagesQuery.isLoading : directMessagesQuery.isLoading;
  const isSending = isGroup ? sendGroup.isPending : sendDirect.isPending;
  const isUploading = isGroup ? uploadGroup.isPending : uploadDirect.isPending;

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

  useEffect(() => {
    if (rows.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    const settleTimeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 250);
    return () => clearTimeout(settleTimeout);
  }, [rows.length]);

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
            mediaTypes: ['images'],
            quality: 0.8,
          })
        : await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPickedAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
      kind: 'image',
    });
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
        },
      }
    );
  }

  const hasContent = content.trim().length > 0 || Boolean(pickedAttachment);
  const canSend = hasContent && !isSending && !isUploading;

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

        <View>
          <Avatar name={name} url={profilePicUrl} size={38} />
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
              tap for contact info
            </Text>
          ) : (
            <Text numberOfLines={1} className="text-[12px] text-white/40">
              {isOnline ? 'Active now' : 'Offline'}
            </Text>
          )}
        </View>

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
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="rgba(255,255,255,0.5)" />
          </View>
        ) : (
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
              contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const distanceFromBottom =
                  contentSize.height - contentOffset.y - layoutMeasurement.height;
                setShowScrollToBottom(distanceFromBottom > 300);
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
                  showSenderName={isGroup && !isOwn}
                  topGapClassName={topGap}
                  onReply={handleReply}
                  messagesByUuid={messagesByUuid}
                  onOpenImageViewer={handleOpenImageViewer}
                  onJumpToMessage={handleJumpToMessage}
                  isHighlighted={highlightedMessageUuid === message.uuid}
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
        )}

        {replyTo ? (
          <View className="flex-row items-center gap-3 border-t border-white/8 bg-white/5 px-4 py-2.5">
            <View className="w-1 self-stretch rounded-full bg-blue-400" />
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-semibold text-blue-400">
                {replyTo.senderName}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13px] text-white/60">
                {replyTo.content ?? 'Message'}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.35)" />
            </Pressable>
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

        <View
          className="flex-row items-end gap-2 border-t border-white/15 px-3 py-2"
          style={{ paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 8) }}
        >
          <Pressable
            onPress={handleAttachPress}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons name="add" size={24} color="rgba(255,255,255,0.7)" />
          </Pressable>

          <View className="min-h-10 max-h-28 flex-1 justify-center rounded-3xl bg-white/10 px-4 py-2">
            <TextInput
              ref={textInputRef}
              value={content}
              onChangeText={handleContentChange}
              placeholder="Type a message..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              textAlignVertical="center"
              style={{ paddingVertical: 0 }}
              className="text-[15px] text-white"
            />
          </View>

          {hasContent ? (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                canSend ? 'bg-button-primary' : 'bg-white/10'
              }`}
            >
              {isSending || isUploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={17}
                  color={canSend ? COLORS.buttonPrimaryForeground : 'rgba(255,255,255,0.35)'}
                />
              )}
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => void pickImage('camera')}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
              >
                <Ionicons name="camera-outline" size={23} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Pressable
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
              >
                <Ionicons name="mic-outline" size={23} color="rgba(255,255,255,0.7)" />
              </Pressable>
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
    </View>
  );
}
