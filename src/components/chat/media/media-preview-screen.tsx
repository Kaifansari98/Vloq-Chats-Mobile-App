import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaQualitySheet, type MediaQuality } from './media-quality-sheet';
import type { PickedAttachment } from '@/components/chat/attachment-sheet';
import { formatFileSize } from '@/lib/utils';

export function MediaPreviewScreen({
  visible,
  attachment,
  onClose,
  onSend,
}: {
  visible: boolean;
  attachment: PickedAttachment | null;
  onClose: () => void;
  onSend: (attachment: PickedAttachment, caption: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [quality, setQuality] = useState<MediaQuality>('STANDARD');
  const [isQualitySheetVisible, setIsQualitySheetVisible] = useState(false);

  if (!visible || !attachment) return null;

  const isVideo = attachment.kind === 'video' || attachment.type.startsWith('video/');
  const sizeText = attachment.sizeBytes ? formatFileSize(attachment.sizeBytes) : null;

  function handleSend() {
    if (!attachment) return;
    onSend(
      {
        ...attachment,
        quality,
      },
      caption.trim()
    );
    setCaption('');
    setQuality('STANDARD');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-black"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ paddingTop: insets.top }}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2 z-10">
          <Pressable
            onPress={onClose}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:bg-white/10"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>

          <View className="flex-row items-center gap-3">
            {/* HD Button */}
            <Pressable
              onPress={() => setIsQualitySheetVisible(true)}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: quality === 'HD' ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.15)',
                borderWidth: 1,
                borderColor: quality === 'HD' ? '#60a5fa' : 'rgba(255,255,255,0.2)',
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={14}
                color={quality === 'HD' ? '#60a5fa' : '#ffffff'}
              />
              <Text
                className={`text-[12px] font-bold ${
                  quality === 'HD' ? 'text-[#60a5fa]' : 'text-white'
                }`}
              >
                HD
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Media Content Preview */}
        <View className="flex-1 items-center justify-center relative">
          <Image
            source={{ uri: attachment.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />

          {isVideo ? (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/25">
                <Ionicons name="play" size={32} color="#ffffff" style={{ marginLeft: 3 }} />
              </View>
              {sizeText ? (
                <View className="mt-4 rounded-full bg-black/60 px-3 py-1">
                  <Text className="text-[12px] font-medium text-white/80">{sizeText}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Bottom Input Toolbar */}
        <View
          className="flex-row items-center gap-3 border-t border-white/10 bg-[#141414] px-4 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-1 flex-row items-center rounded-full bg-white/10 px-4 py-2.5">
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="flex-1 text-[15px] text-white"
              multiline
              maxLength={1000}
            />
          </View>

          <Pressable
            onPress={handleSend}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#60a5fa] active:opacity-80"
          >
            <Ionicons name="send" size={20} color="#000000" style={{ marginLeft: 2 }} />
          </Pressable>
        </View>

        {/* Quality Sheet */}
        <MediaQualitySheet
          visible={isQualitySheetVisible}
          currentQuality={quality}
          onSelectQuality={setQuality}
          onClose={() => setIsQualitySheetVisible(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
