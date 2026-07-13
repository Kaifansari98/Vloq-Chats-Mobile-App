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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { TypingDots } from '@/components/typing-dots';
import { COLORS } from '@/constants/theme';
import { formatDateDivider } from '@/lib/utils';
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
import type { DirectMessage } from '@/hooks/use-direct-messages';

const TYPING_STOP_DELAY = 2000;

type PickedImage = { uri: string; name: string; type: string };

type RenderRow =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; message: DirectMessage }
  | { kind: 'typing'; key: string };

function formatBubbleTime(dateString: string): string {
  return format(new Date(dateString), 'h:mm a');
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

  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setPickedImage({
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  }

  function handleAttachPress() {
    Alert.alert('Add attachment', undefined, [
      { text: 'Choose Photo', onPress: () => void pickImage('library') },
      { text: 'Take Photo', onPress: () => void pickImage('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed && !pickedImage) return;

    stopTyping();

    if (pickedImage) {
      const uploadMutation = isGroup ? uploadGroup : uploadDirect;
      uploadMutation.mutate(
        {
          content: trimmed,
          files: [pickedImage],
          replyToMessageUuid: replyTo?.uuid,
        },
        {
          onSuccess: () => {
            setContent('');
            setPickedImage(null);
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

  const canSend = (content.trim().length > 0 || pickedImage) && !isSending && !isUploading;

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="rgba(255,255,255,0.5)" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(row) => row.key}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
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
              const imageAttachment = message.attachments.find(
                (attachment) => attachment.attachmentType === 'IMAGE'
              );

              return (
                <Pressable
                  onLongPress={() => setReplyTo(message)}
                  className={`mb-1.5 flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <View
                    className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                      isOwn
                        ? 'rounded-tr-sm bg-bubbleSent'
                        : 'rounded-tl-sm bg-bubbleReceived'
                    }`}
                  >
                    {isGroup && !isOwn ? (
                      <Text className="mb-0.5 text-[11px] font-semibold text-blue-400">
                        {message.senderName}
                      </Text>
                    ) : null}

                    {message.replyTo ? (
                      <View
                        className={`mb-1.5 flex-row gap-2 rounded-lg px-2 py-1.5 ${
                          isOwn ? 'bg-white/15' : 'bg-white/6'
                        }`}
                      >
                        <View
                          className={`w-0.5 rounded-full ${isOwn ? 'bg-white/60' : 'bg-blue-400'}`}
                        />
                        <View className="min-w-0 flex-1">
                          <Text
                            className={`text-[11px] font-semibold ${
                              isOwn ? 'text-white/90' : 'text-blue-400'
                            }`}
                          >
                            {message.replyTo.senderName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className={`text-[11px] ${isOwn ? 'text-white/65' : 'text-white/50'}`}
                          >
                            {message.replyTo.attachmentType === 'IMAGE'
                              ? 'Photo'
                              : message.replyTo.attachmentType === 'FILE'
                                ? 'Document'
                                : message.replyTo.attachmentType === 'AUDIO'
                                  ? 'Audio'
                                  : (message.replyTo.content ?? 'Message')}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {imageAttachment ? (
                      <Image
                        source={{ uri: imageAttachment.url }}
                        className="mb-1.5 h-48 w-56 rounded-lg"
                        resizeMode="cover"
                      />
                    ) : null}

                    {message.content ? (
                      <Text
                        className={`text-[15px] ${isOwn ? 'text-white' : 'text-white/95'}`}
                      >
                        {message.content}
                      </Text>
                    ) : null}

                    <View className="mt-1 flex-row items-center justify-end gap-1">
                      <Text
                        className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}
                      >
                        {formatBubbleTime(message.createdAt)}
                      </Text>
                      {isOwn ? (
                        <Ionicons
                          name={message.status === 'read' ? 'checkmark-done' : 'checkmark'}
                          size={14}
                          color={
                            message.status === 'read'
                              ? '#60a5fa'
                              : 'rgba(255,255,255,0.55)'
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        {replyTo ? (
          <View className="flex-row items-center gap-2 border-t border-white/8 bg-white/5 px-4 py-2">
            <View className="w-0.5 self-stretch rounded-full bg-blue-400" />
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-semibold text-blue-400">
                {replyTo.senderName}
              </Text>
              <Text numberOfLines={1} className="text-[12px] text-white/50">
                {replyTo.content ?? 'Message'}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        ) : null}

        {pickedImage ? (
          <View className="flex-row items-center gap-2 border-t border-white/8 bg-white/5 px-4 py-2">
            <Image source={{ uri: pickedImage.uri }} className="h-12 w-12 rounded-lg" />
            <Text className="flex-1 text-[12px] text-white/50">Photo ready to send</Text>
            <Pressable onPress={() => setPickedImage(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
        ) : null}

        <View
          className="flex-row items-end gap-2 border-t border-white/8 px-3 py-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
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
              value={content}
              onChangeText={handleContentChange}
              placeholder="Message"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              className="text-[15px] text-white"
            />
          </View>

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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
