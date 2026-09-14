import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@/components/ui/app-dialog';
import { api } from '@/lib/api';
import type { DirectMessage } from '@/hooks/use-direct-messages';

type Props = { isGroup: boolean; conversationUuid: string; memberId: number; onClose: () => void; onSelect: (uuid: string) => void };
type SearchResponse = { data: DirectMessage[]; pagination: { page: number; limit: number; hasMore: boolean } };

export function MessageSearch({ isGroup, conversationUuid, memberId, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timeout);
  }, [text]);
  const search = useInfiniteQuery({
    queryKey: ['message-search', isGroup, conversationUuid, memberId, query],
    initialPageParam: 1,
    enabled: query.length > 0,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await api.get<SearchResponse>(isGroup ? `/chats/group/${conversationUuid}/messages/search` : '/chats/direct/messages/search', {
        params: { q: query, page: pageParam, limit: 25, ...(!isGroup && { participantUserId: memberId }) }, signal,
      });
      return data;
    },
    getNextPageParam: (last) => last.pagination.hasMore ? last.pagination.page + 1 : undefined,
  });
  const waiting = text.trim() !== query;
  const results = query && !waiting ? search.data?.pages.flatMap((page) => page.data) ?? [] : [];
  return (
    <AppModal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#111111', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-3 p-4 border-b border-white/10">
          <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={onClose} hitSlop={12}><Ionicons name="arrow-back" size={24} color="white" /></Pressable>
          <TextInput autoFocus value={text} onChangeText={setText} maxLength={200} placeholder="Search messages…" placeholderTextColor="#888" accessibilityLabel="Search messages" returnKeyType="search" className="flex-1 text-white text-base" />
          {!!text && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText('')} hitSlop={12}><Ionicons name="close-circle" size={22} color="#aaa" /></Pressable>}
        </View>
        <FlatList
          data={results}
          keyExtractor={(item) => item.uuid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={<View className="items-center py-12"><Text className="text-white/50 text-center">{!text.trim() ? 'Search for a word or phrase in this chat' : waiting || search.isPending ? 'Searching…' : search.isError ? 'Could not search messages.' : 'No matching messages'}</Text>{search.isError && !waiting && !!query && <Pressable onPress={() => void search.refetch()} className="p-4"><Text className="text-white">Try again</Text></Pressable>}</View>}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open message from ${item.senderName}`} onPress={() => { onClose(); onSelect(item.uuid); }} className="p-4 mb-3 rounded-2xl bg-white/5 border border-white/10"><View className="flex-row justify-between gap-3 mb-2"><Text className="text-white font-semibold flex-1">{item.isOwnMessage ? 'You' : item.senderName}</Text><Text className="text-white/40 text-xs">{new Date(item.createdAt).toLocaleDateString()}</Text></View><Text className="text-white/80" numberOfLines={4}>{item.content}</Text></Pressable>}
          ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color="white" /> : search.hasNextPage && !waiting ? <Pressable className="p-4 items-center" onPress={() => void search.fetchNextPage()}><Text className="text-white">{search.isFetchNextPageError ? 'Retry loading more' : 'Load more results'}</Text></Pressable> : null}
        />
      </KeyboardAvoidingView>
    </AppModal>
  );
}
