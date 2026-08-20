import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDirectChats } from '@/hooks/use-direct-chats';
import type { Chat, DirectChat, GroupChat } from '@/hooks/use-direct-chats';
import type { DirectMessage } from '@/hooks/use-direct-messages';
import { getMessagePreview } from '@/lib/message-preview';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ForwardTarget = {
  id: string;
  name: string;
  profilePicUrl: string | null;
  isGroup: boolean;
  memberId: number;
  conversationUuid: string;
};

function chatToTarget(chat: Chat): ForwardTarget {
  if (chat.type === 'DIRECT') {
    const dc = chat as DirectChat;
    return {
      id: dc.uuid,
      name: dc.otherParticipant.name,
      profilePicUrl: dc.otherParticipant.profile_pic_url ?? null,
      isGroup: false,
      memberId: dc.otherParticipant.id,
      conversationUuid: dc.uuid,
    };
  }
  const gc = chat as GroupChat;
  return {
    id: gc.uuid,
    name: gc.name,
    profilePicUrl: null,
    isGroup: true,
    memberId: 0,
    conversationUuid: gc.uuid,
  };
}

export function ForwardPicker({
  visible,
  message,
  onClose,
  onForwardComplete,
}: {
  visible: boolean;
  message: DirectMessage | null;
  onClose: () => void;
  onForwardComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const { data: chatsData, isLoading } = useDirectChats(1, '', 'ALL');
  const chats = chatsData?.data ?? [];

  const targets = useMemo(() => chats.map(chatToTarget), [chats]);

  const filteredTargets = useMemo(() => {
    if (!searchQuery.trim()) return targets;
    const q = searchQuery.toLowerCase();
    return targets.filter((t) => t.name.toLowerCase().includes(q));
  }, [targets, searchQuery]);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedIds(new Set());
      setIsSending(false);
      slideAnim.setValue(1000);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    }
  }, [visible, slideAnim]);

  function animateClose() {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const queryClient = useQueryClient();

  async function handleForward() {
    console.log('[ForwardPicker] handleForward triggered!');
    console.log('[ForwardPicker] message:', message);
    console.log('[ForwardPicker] selectedIds size:', selectedIds.size, 'IDs:', Array.from(selectedIds));

    if (!message || selectedIds.size === 0) {
      console.log('[ForwardPicker] EARLY EXIT: message is null or no items selected');
      return;
    }

    setIsSending(true);

    const selectedTargets = targets.filter((t) => selectedIds.has(t.id));
    console.log('[ForwardPicker] selectedTargets:', JSON.stringify(selectedTargets));

    const targetDirectParticipantUserIds = selectedTargets
      .filter((t) => !t.isGroup && t.memberId > 0)
      .map((t) => t.memberId);
    const targetGroupConversationUuids = selectedTargets
      .filter((t) => t.isGroup || t.memberId === 0)
      .map((t) => t.conversationUuid);

    console.log('[ForwardPicker] Payload to send:', {
      messageUuid: message.uuid,
      targetDirectParticipantUserIds,
      targetGroupConversationUuids,
    });

    try {
      console.log('[ForwardPicker] Calling api.post /chats/forward ...');
      const response = await api.post<{ message: string; forwardedCount: number }>(
        '/chats/forward',
        {
          messageUuid: message.uuid,
          targetDirectParticipantUserIds,
          targetGroupConversationUuids,
        },
      );

      console.log('[ForwardPicker] API Response:', response.data, 'Status:', response.status);

      setIsSending(false);

      if (response.data && response.data.forwardedCount > 0) {
        console.log('[ForwardPicker] Forward successful! Invalidating queries & closing modal...');
        void queryClient.invalidateQueries({ queryKey: ['direct-chats'] });
        void queryClient.invalidateQueries({ queryKey: ['direct-messages'] });
        void queryClient.invalidateQueries({ queryKey: ['group-messages'] });

        onForwardComplete();
        animateClose();
      } else {
        console.warn('[ForwardPicker] Forward response returned 0 count:', response.data);
        Alert.alert('Forward Failed', 'Could not forward the message. Please try again.');
      }
    } catch (error) {
      setIsSending(false);
      console.error('[ForwardPicker] Error during forward API call:', error);
      Alert.alert('Forward Failed', 'Could not forward the message. Please try again.');
    }
  }

  if (!visible) return null;

  const selectedCount = selectedIds.size;

  // Preview of the message being forwarded
  const messagePreview = message?.content?.trim()
    ? message.content.length > 60
      ? `${message.content.slice(0, 60)}…`
      : message.content
    : getMessagePreview(message);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <Animated.View
        className="flex-1 bg-[#111111]"
        style={{ transform: [{ translateY: slideAnim }], paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-white/8 px-4 pb-3">
          <Pressable
            onPress={animateClose}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-white">Forward to...</Text>
            {selectedCount > 0 ? (
              <Text className="text-[12px] text-white/50">
                {selectedCount} {selectedCount === 1 ? 'chat' : 'chats'} selected
              </Text>
            ) : null}
          </View>
        </View>

        {/* Search */}
        <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-full bg-white/8 px-4 py-2.5">
          <Ionicons name="search" size={17} color="rgba(255,255,255,0.4)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chats..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            className="flex-1 text-[14px] text-white"
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
            </Pressable>
          ) : null}
        </View>

        {/* Message being forwarded */}
        <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
          <Ionicons name="arrow-redo" size={14} color="#34d399" />
          <Text numberOfLines={1} className="flex-1 text-[12px] text-white/50">
            {messagePreview}
          </Text>
        </View>

        {/* Chat list */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loader size={28} color="rgba(255,255,255,0.4)" />
          </View>
        ) : (
          <FlatList
            data={filteredTargets}
            keyExtractor={(item) => item.id}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
            ItemSeparatorComponent={() => (
              <View className="ml-[68px] h-px bg-white/5" />
            )}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable
                  onPress={() => toggleSelection(item.id)}
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-white/5"
                >
                  {/* Checkbox */}
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isSelected ? '#34d399' : 'transparent',
                      borderWidth: isSelected ? 0 : 2,
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    ) : null}
                  </View>

                  <Avatar name={item.name} url={item.profilePicUrl} size={44} />

                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-[15px] font-semibold text-white">
                      {item.name}
                    </Text>
                    <Text className="text-[12px] text-white/35">
                      {item.isGroup ? 'Group' : 'Direct chat'}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center px-6 py-16">
                <Ionicons name="chatbubbles-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text className="mt-3 text-[14px] text-white/40">
                  {searchQuery ? 'No chats match your search' : 'No chats available'}
                </Text>
              </View>
            }
          />
        )}

        {/* Forward button */}
        {selectedCount > 0 ? (
          <View
            className="absolute bottom-0 left-0 right-0 border-t border-white/8 bg-[#111111] px-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 4, paddingTop: 12 }}
          >
            <Pressable
              onPress={() => void handleForward()}
              disabled={isSending}
              className="flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-80"
              style={{ backgroundColor: '#34d399' }}
            >
              {isSending ? (
                <Loader size={18} color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="arrow-redo" size={18} color="#ffffff" />
                  <Text className="text-[16px] font-bold text-white">
                    Forward ({selectedCount})
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}
