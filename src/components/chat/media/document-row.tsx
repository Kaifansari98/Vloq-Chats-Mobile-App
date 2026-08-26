import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/utils';
import type { MessageAttachment } from '@/hooks/use-direct-messages';
import { resolveMediaUrl } from '@/lib/api';

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
  txt: '#64748b',
};

export function getFileExtension(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : 'file';
}

export function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension] ?? '#818cf8';
}

export type DocumentItem = {
  attachment: MessageAttachment;
  messageUuid: string;
  senderName: string;
  createdAt: string;
};

export function DocumentRow({ doc }: { doc: DocumentItem }) {
  const ext = getFileExtension(doc.attachment.name);
  const color = getFileColor(ext);
  const formattedDate = format(new Date(doc.createdAt), 'MMM d, yyyy');
  const docUrl = resolveMediaUrl(doc.attachment.url);

  return (
    <Pressable
      onPress={() => void Linking.openURL(docUrl)}
      className="flex-row items-center gap-3.5 px-4 py-3 active:bg-white/5"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22` }}
      >
        <Ionicons name="document-text" size={22} color={color} />
      </View>

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[14px] font-semibold text-white">
          {doc.attachment.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text className="text-[11px] font-bold uppercase" style={{ color }}>
            {ext}
          </Text>
          <View className="h-0.5 w-0.5 rounded-full bg-white/20" />
          <Text className="text-[11px] text-white/40">
            {formatFileSize(doc.attachment.sizeBytes)}
          </Text>
          <View className="h-0.5 w-0.5 rounded-full bg-white/20" />
          <Text className="text-[11px] text-white/40">
            {doc.senderName} · {formattedDate}
          </Text>
        </View>
      </View>

      <View className="h-8 w-8 items-center justify-center rounded-full bg-white/5">
        <Ionicons name="download-outline" size={17} color="rgba(255,255,255,0.5)" />
      </View>
    </Pressable>
  );
}
