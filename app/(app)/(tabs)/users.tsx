import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useChatSocketState } from '@/hooks/use-chat-socket';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { Loader } from '@/components/ui/Loader';

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const onlineUserIds = useChatSocketState().onlineUserIds;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, refetch } = useOrganizationMembers(1, search, 50);
  const members = (data?.data ?? []).filter((member) => member.uuid !== user?.uuid);
  const onlineSet = new Set(onlineUserIds);

  async function handleManualRefresh() {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: insets.top }} className="flex-1 bg-background">
      <View className="px-5 pb-4 pt-3">
        <Text className="text-[34px] font-extrabold text-white">Users</Text>

        <View className="mt-4 flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-3">
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search users"
            placeholderTextColor="rgba(255,255,255,0.5)"
            returnKeyType="search"
            className="flex-1 text-[15px] text-white"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center pb-20">
          <Loader size={36} color="rgba(255,255,255,0.45)" />
        </View>
      ) : members.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 pb-20">
          <Text className="text-lg text-white/60">No users found</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.uuid}
          refreshing={isManualRefreshing}
          onRefresh={() => void handleManualRefresh()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => (
            <View className="ml-[80px] h-px bg-white/5" />
          )}
          renderItem={({ item }) => {
            const isOnline = onlineSet.has(item.id);

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(app)/chat/[id]',
                    params: {
                      id: item.uuid,
                      isGroup: '0',
                      memberId: String(item.id),
                      name: item.name,
                      profilePicUrl: item.profile_pic_url ?? '',
                    },
                  })
                }
                className="flex-row items-center gap-3 px-5 py-3 active:bg-white/5"
              >
                <View>
                  <Avatar name={item.name} url={item.profile_pic_url} size={48} />
                  {isOnline ? (
                    <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-400" />
                  ) : null}
                </View>

                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[15px] font-semibold text-white/90"
                  >
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} className="text-[13px] text-white/40">
                    {isOnline ? 'Active now' : item.email}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
