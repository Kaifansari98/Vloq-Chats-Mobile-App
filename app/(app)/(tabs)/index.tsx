import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TextShimmerWave } from '@/components/text-shimmer-wave';
import { formatChatTime } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useChatSocketState } from '@/hooks/use-chat-socket';
import { useDirectChats } from '@/hooks/use-direct-chats';
import type { Chat, ChatListFilter, DirectChat } from '@/hooks/use-direct-chats';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import type { Member } from '@/hooks/use-organization-members';

const FILTER_TABS: Array<{ value: ChatListFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'GROUPS', label: 'Group' },
];

type PreviewIcon = React.ComponentProps<typeof Ionicons>['name'];

type ConversationItem = {
  id: string;
  name: string;
  profilePicUrl: string | null;
  preview: { icon: PreviewIcon | null; text: string };
  timeLabel: string;
  unreadCount: number;
  latestActivityAt: number;
  isGroup: boolean;
  memberId: number;
};

function getChatMeta(chat: Chat) {
  if (chat.type === 'DIRECT') {
    return {
      name: chat.otherParticipant.name,
      profilePicUrl: chat.otherParticipant.profile_pic_url ?? null,
    };
  }
  return { name: chat.name, profilePicUrl: null };
}

function getLastMessagePreview(
  lastMessage: Chat['lastMessage']
): { icon: PreviewIcon | null; text: string } {
  if (!lastMessage) return { icon: null, text: 'No messages yet' };
  if (lastMessage.content?.trim()) return { icon: null, text: lastMessage.content };

  switch (lastMessage.type) {
    case 'IMAGE':
      return { icon: 'camera', text: 'Photo' };
    case 'VIDEO':
      return { icon: 'videocam', text: 'Video' };
    case 'AUDIO':
      return { icon: 'mic', text: 'Audio' };
    case 'FILE':
      return { icon: 'document', text: 'Document' };
    default:
      return { icon: null, text: 'New message' };
  }
}

function getActivityTimestamp(dateString?: string | null): number {
  if (!dateString) return 0;
  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function chatToItem(chat: Chat): ConversationItem {
  const meta = getChatMeta(chat);
  return {
    id: chat.uuid,
    name: meta.name,
    profilePicUrl: meta.profilePicUrl,
    preview: getLastMessagePreview(chat.lastMessage),
    timeLabel: chat.lastMessage ? formatChatTime(chat.lastMessage.createdAt) : '',
    unreadCount: chat.unreadCount,
    latestActivityAt: getActivityTimestamp(chat.lastMessage?.createdAt),
    isGroup: chat.type === 'GROUP',
    memberId: chat.type === 'DIRECT' ? chat.otherParticipant.id : 0,
  };
}

function memberToItem(member: Member): ConversationItem {
  return {
    id: member.uuid,
    name: member.name,
    profilePicUrl: member.profile_pic_url ?? null,
    preview: { icon: null, text: 'No messages yet' },
    timeLabel: '',
    unreadCount: 0,
    latestActivityAt: 0,
    isGroup: false,
    memberId: member.id,
  };
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { typingUserIds, typingConversationIds, onlineUserIds } = useChatSocketState();
  const [activeFilter, setActiveFilter] = useState<ChatListFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: chatsData, isLoading: isLoadingChats, refetch } =
    useDirectChats(1, search, activeFilter);
  const { data: membersData, isLoading: isLoadingMembers } =
    useOrganizationMembers(1, search);

  async function handleManualRefresh() {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  const chats = chatsData?.data ?? [];
  const chatItems = chats.map(chatToItem);

  // "All" also surfaces org members who don't have a chat thread yet, so new
  // conversations can be started with anyone — matching the web sidebar.
  let items = chatItems;
  if (activeFilter === 'ALL') {
    const membersWithDirectChat = new Set(
      chats
        .filter((chat): chat is DirectChat => chat.type === 'DIRECT')
        .map((chat) => chat.otherParticipant.uuid)
    );

    const memberItems = (membersData?.data ?? [])
      .filter(
        (member) =>
          member.uuid !== user?.uuid && !membersWithDirectChat.has(member.uuid)
      )
      .map(memberToItem);

    items = [...chatItems, ...memberItems];
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.latestActivityAt !== b.latestActivityAt) {
      return b.latestActivityAt - a.latestActivityAt;
    }
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return a.name.localeCompare(b.name);
  });

  const typingUserIdSet = new Set(typingUserIds);
  const typingConversationIdSet = new Set(typingConversationIds);
  const onlineUserIdSet = new Set(onlineUserIds);

  const isLoading =
    isLoadingChats || (activeFilter === 'ALL' && isLoadingMembers);

  const emptyLabel =
    activeFilter === 'UNREAD'
      ? 'No unread chats'
      : activeFilter === 'GROUPS'
        ? 'No groups yet'
        : 'No chats yet';

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-4 pt-3">
        <Text className="text-[34px] font-extrabold text-white">Chats</Text>

        <View className="mt-4 flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-3">
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search chats"
            placeholderTextColor="rgba(255,255,255,0.5)"
            returnKeyType="search"
            className="flex-1 text-[15px] text-white"
          />
        </View>

        <View className="mt-3 flex-row gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;

            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`rounded-full border px-4 py-2 ${
                  isActive
                    ? 'border-blue-500/30 bg-blue-500/15'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    isActive ? 'text-blue-400' : 'text-white/60'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center pb-20">
          <ActivityIndicator color="rgba(255,255,255,0.5)" />
        </View>
      ) : sortedItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 pb-20">
          <Text className="text-lg text-white/60">{emptyLabel}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          refreshing={isManualRefreshing}
          onRefresh={() => void handleManualRefresh()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => (
            <View className="ml-[80px] h-px bg-white/5" />
          )}
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount > 0;
            const isTyping = item.isGroup
              ? typingConversationIdSet.has(item.id)
              : typingUserIdSet.has(item.memberId);
            const isOnline = !item.isGroup && onlineUserIdSet.has(item.memberId);

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(app)/chat/[id]',
                    params: {
                      id: item.id,
                      isGroup: item.isGroup ? '1' : '0',
                      memberId: String(item.memberId),
                      name: item.name,
                      profilePicUrl: item.profilePicUrl ?? '',
                    },
                  })
                }
                className="flex-row items-center gap-3 px-5 py-3 active:bg-white/5"
              >
                <View>
                  <Avatar name={item.name} url={item.profilePicUrl} size={48} />
                  {isOnline ? (
                    <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-400" />
                  ) : null}
                </View>

                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      numberOfLines={1}
                      className={`flex-1 text-[15px] ${
                        hasUnread
                          ? 'font-bold text-white'
                          : 'font-semibold text-white/90'
                      }`}
                    >
                      {item.name}
                    </Text>
                    <Text
                      className={`text-[12px] ${
                        hasUnread ? 'font-semibold text-blue-400' : 'text-white/40'
                      }`}
                    >
                      {item.timeLabel}
                    </Text>
                  </View>

                  <View className="mt-0.5 flex-row items-center justify-between gap-2">
                    {isTyping ? (
                      <View className="flex-1 flex-row items-center">
                        <TextShimmerWave
                          text="typing..."
                          fontSize={13}
                          fontWeight="500"
                          baseColor="rgba(96,165,250,0.4)"
                          peakColor="#60a5fa"
                        />
                      </View>
                    ) : (
                      <View className="flex-1 flex-row items-center gap-1">
                        {item.preview.icon ? (
                          <Ionicons
                            name={item.preview.icon}
                            size={13}
                            color="rgba(255,255,255,0.4)"
                          />
                        ) : null}
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-[13px] text-white/40"
                        >
                          {item.preview.text}
                        </Text>
                      </View>
                    )}

                    <Badge count={item.unreadCount} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
