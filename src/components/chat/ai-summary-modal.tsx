import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Loader } from '@/components/ui/Loader';
import type { ChatSummaryResult } from '@/lib/ai';

export function AISummaryModal({
  visible,
  onClose,
  summary,
  isLoading,
  chatName,
}: {
  visible: boolean;
  onClose: () => void;
  summary: ChatSummaryResult | null;
  isLoading: boolean;
  chatName: string;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[82%] rounded-t-3xl bg-[#1a1a1a] pb-8 pt-3 px-5">
          {/* Header handle */}
          <View className="items-center pb-3">
            <View className="h-1 w-10 rounded-full bg-white/25" />
          </View>

          {/* Title */}
          <View className="flex-row items-center justify-between pb-4 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                <Ionicons name="sparkles" size={18} color="#60a5fa" />
              </View>
              <View>
                <Text className="text-[17px] font-bold text-white">AI Chat Summary</Text>
                <Text className="text-[12px] text-white/50">{chatName}</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View className="items-center py-12">
                <Loader size={32} color="#60a5fa" />
                <Text className="mt-3 text-[13px] text-white/60">
                  Analyzing conversation & generating summary...
                </Text>
              </View>
            ) : summary ? (
              <View className="gap-4 pb-6">
                {/* Overview */}
                <View className="rounded-2xl bg-white/5 p-4 border border-white/8">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Overview
                  </Text>
                  <Text className="mt-1.5 text-[14px] leading-5 text-white/90">
                    {summary.overview}
                  </Text>
                </View>

                {/* Key Points */}
                <View className="rounded-2xl bg-white/5 p-4 border border-white/8">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Key Discussion Points
                  </Text>
                  <View className="mt-2.5 gap-2">
                    {summary.keyPoints.map((point, index) => (
                      <View key={index} className="flex-row gap-2.5">
                        <Text className="text-[14px] text-blue-400">•</Text>
                        <Text className="flex-1 text-[13px] leading-5 text-white/80">
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 ? (
                  <View className="rounded-2xl bg-white/5 p-4 border border-white/8">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Action Items
                    </Text>
                    <View className="mt-2.5 gap-2">
                      {summary.actionItems.map((item, index) => (
                        <View key={index} className="flex-row items-center gap-2">
                          <Ionicons name="checkmark-circle-outline" size={15} color="#34d399" />
                          <Text className="flex-1 text-[13px] text-white/80">
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="items-center py-8">
                <Text className="text-[14px] text-white/50">No messages to summarize yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
