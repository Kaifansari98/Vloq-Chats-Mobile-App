import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAIReplySuggestions } from '@/hooks/use-ai-features';

export function AIReplySuggestionsRow({
  lastMessageContent,
  senderName,
  onSelectSuggestion,
  visible,
}: {
  lastMessageContent: string | null;
  senderName: string;
  onSelectSuggestion: (text: string) => void;
  visible: boolean;
}) {
  const { data: suggestions, isLoading } = useAIReplySuggestions(
    lastMessageContent,
    senderName,
    visible
  );

  if (!visible || (!isLoading && (!suggestions || suggestions.length === 0))) {
    return null;
  }

  return (
    <View className="border-t border-white/8 bg-[#141414] py-2 px-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      >
        <View className="flex-row items-center gap-1 pr-1">
          <Ionicons name="sparkles" size={13} color="#60a5fa" />
          <Text className="text-[11px] font-semibold text-blue-400">AI Reply</Text>
        </View>

        {isLoading ? (
          <View className="rounded-full bg-white/5 px-3 py-1.5 border border-white/10">
            <Text className="text-[12px] italic text-white/50">Generating smart replies...</Text>
          </View>
        ) : (
          suggestions?.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => onSelectSuggestion(item)}
              className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3.5 py-1.5 active:bg-blue-500/30"
            >
              <Text className="text-[12px] font-medium text-blue-300">{item}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
