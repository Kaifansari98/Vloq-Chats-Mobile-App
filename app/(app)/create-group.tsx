import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrganizationMembers, Member } from '@/hooks/use-organization-members';
import { useCreateGroupChat } from '@/hooks/use-group-chats';
import { useAuth } from '@/hooks/use-auth';
import { COLORS } from '@/constants/theme';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#3b82f6', '#06b6d4', '#f59e0b',
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MemberAvatar({ member, size }: { member: Member; size: number }) {
  if (member.profile_pic_url) {
    return (
      <Image
        source={{ uri: member.profile_pic_url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1e293b',
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getAvatarColor(member.id),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.34 }}>
        {getInitials(member.name)}
      </Text>
    </View>
  );
}

function MemberItem({
  member,
  isSelected,
  onToggle,
}: {
  member: Member;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: isSelected
            ? 'rgba(99, 102, 241, 0.14)'
            : 'transparent',
        }}
      >
        <MemberAvatar member={member} size={44} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
            {member.name}
          </Text>
          <Text
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}
            numberOfLines={1}
          >
            {member.email}
          </Text>
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: isSelected ? '#10b981' : 'rgba(255,255,255,0.25)',
            backgroundColor: isSelected ? '#10b981' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
        </View>
      </View>
    </Pressable>
  );
}

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');

  const { data: membersData, isLoading } = useOrganizationMembers(1, search, 100);
  const createGroupMutation = useCreateGroupChat();

  const members = useMemo(() => {
    const all = (membersData?.data ?? []).filter(
      (m) => m.uuid !== currentUser?.uuid,
    );
    return [...all].sort((a, b) => a.name.localeCompare(b.name));
  }, [membersData, currentUser]);

  function toggleMember(member: Member) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(member.id)) next.delete(member.id);
      else next.add(member.id);
      return next;
    });
    setSelectedMembers((prev) => {
      if (prev.some((m) => m.id === member.id))
        return prev.filter((m) => m.id !== member.id);
      return [...prev, member];
    });
  }

  function handleBack() {
    if (step === 'name') {
      setStep('select');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)');
    }
  }

  async function handleCreate() {
    if (!groupName.trim() || selectedIds.size === 0 || createGroupMutation.isPending)
      return;
    try {
      const result = await createGroupMutation.mutateAsync({
        name: groupName.trim(),
        memberIds: Array.from(selectedIds),
      });
      const uuid = result.data?.uuid;
      const createdName = groupName.trim();
      if (uuid) {
        router.replace({
          pathname: '/(app)/chat/[id]',
          params: {
            id: uuid,
            isGroup: '1',
            memberId: '0',
            name: createdName,
            profilePicUrl: '',
          },
        });
      } else {
        handleBack();
      }
    } catch (e) {
      console.error('Failed to create group:', e);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* ───── Step 1: Select Members ───── */}
          {step === 'select' ? (
            <View style={{ flex: 1 }}>
              {/* Header bar */}
              <View style={s.header}>
                <Pressable onPress={handleBack} hitSlop={8}>
                  <View style={s.headerIcon}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                  </View>
                </Pressable>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.headerTitle}>Add Members</Text>
                  <Text style={s.headerSub}>
                    {selectedIds.size === 0
                      ? 'Select members'
                      : `${selectedIds.size} selected`}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setStep('name')}
                  disabled={selectedIds.size === 0}
                >
                  <View
                    style={[
                      s.pillBtn,
                      selectedIds.size === 0 && { opacity: 0.35 },
                    ]}
                  >
                    <Text style={s.pillText}>Next</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color="#fff"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </Pressable>
              </View>

              {/* Search */}
              <View style={s.searchWrap}>
                <View style={s.searchRow}>
                  <Ionicons name="search" size={17} color="#818cf8" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search name or email..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={6}>
                      <Ionicons
                        name="close-circle"
                        size={17}
                        color="rgba(255,255,255,0.5)"
                      />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Selected chips */}
              {selectedMembers.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.chipsBar}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  {selectedMembers.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => toggleMember(m)}
                      style={{ alignItems: 'center', marginRight: 14, width: 50 }}
                    >
                      <View style={{ position: 'relative' }}>
                        <MemberAvatar member={m} size={38} />
                        <View style={s.chipX}>
                          <Ionicons name="close" size={10} color="#fff" />
                        </View>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.7)',
                          marginTop: 3,
                          textAlign: 'center',
                        }}
                      >
                        {m.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* Member list */}
              {isLoading ? (
                <View style={s.center}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
                    Loading...
                  </Text>
                </View>
              ) : members.length === 0 ? (
                <View style={s.center}>
                  <Ionicons
                    name="people-outline"
                    size={44}
                    color="rgba(255,255,255,0.2)"
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                    No members found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={members}
                  keyExtractor={(item) => String(item.id)}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  ItemSeparatorComponent={() => (
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        marginLeft: 72,
                      }}
                    />
                  )}
                  renderItem={({ item }) => (
                    <MemberItem
                      member={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggle={() => toggleMember(item)}
                    />
                  )}
                />
              )}
            </View>
          ) : (
            /* ───── Step 2: Name the Group ───── */
            <View style={{ flex: 1 }}>
              <View style={s.header}>
                <Pressable onPress={() => setStep('select')} hitSlop={8}>
                  <View style={s.headerIcon}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                  </View>
                </Pressable>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.headerTitle}>New Group</Text>
                  <Text style={s.headerSub}>
                    {selectedMembers.length}{' '}
                    {selectedMembers.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => void handleCreate()}
                  disabled={
                    !groupName.trim() || createGroupMutation.isPending
                  }
                >
                  <View
                    style={[
                      s.pillBtn,
                      (!groupName.trim() || createGroupMutation.isPending) && {
                        opacity: 0.35,
                      },
                    ]}
                  >
                    {createGroupMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.pillText}>Create</Text>
                    )}
                  </View>
                </Pressable>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              >
                {/* Group name card */}
                <View style={s.groupCard}>
                  <View style={s.groupIcon}>
                    <Ionicons name="people" size={28} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#818cf8',
                        letterSpacing: 1,
                        marginBottom: 4,
                      }}
                    >
                      GROUP NAME
                    </Text>
                    <TextInput
                      style={{
                        fontSize: 16,
                        color: '#fff',
                        paddingVertical: 2,
                        borderBottomWidth: 1,
                        borderBottomColor: '#6366f1',
                      }}
                      placeholder="Enter group subject..."
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={groupName}
                      onChangeText={setGroupName}
                      maxLength={80}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Participant list */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  MEMBERS ({selectedMembers.length})
                </Text>

                {selectedMembers.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                    }}
                  >
                    <MemberAvatar member={m} size={42} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                        {m.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.45)',
                          marginTop: 1,
                        }}
                      >
                        {m.email}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: COLORS.background,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
  },
  chipsBar: {
    maxHeight: 80,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },
  chipX: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
