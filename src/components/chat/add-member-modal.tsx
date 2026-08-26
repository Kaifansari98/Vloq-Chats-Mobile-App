import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOrganizationMembers, type Member } from '@/hooks/use-organization-members';
import { useAddGroupMembers, type GroupParticipantFull } from '@/hooks/use-group-chats';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { COLORS } from '@/constants/theme';

type AddMemberModalProps = {
  visible: boolean;
  groupUuid: string;
  groupName: string;
  existingParticipants: GroupParticipantFull[];
  onClose: () => void;
};

export function AddMemberModal({
  visible,
  groupUuid,
  groupName,
  existingParticipants,
  onClose,
}: AddMemberModalProps) {
  const [search, setSearch] = useState('');
  const { data: membersData, isLoading } = useOrganizationMembers(1, search, 100);
  const addMembersMutation = useAddGroupMembers(groupUuid);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter out users already in the group
  const existingUserIds = useMemo(() => {
    return new Set(existingParticipants.map((p) => p.id));
  }, [existingParticipants]);

  const availableUsers = useMemo(() => {
    const list: Member[] = membersData?.data ?? [];
    return list.filter((u: Member) => !existingUserIds.has(u.id));
  }, [membersData, existingUserIds]);

  function toggleSelect(id: number) {
    void Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleAdd() {
    if (selectedIds.length === 0 || addMembersMutation.isPending) return;
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addMembersMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch (err: any) {
      console.error('Failed to add members:', err);
      Alert.alert(
        'Add Member Error',
        err?.response?.data?.message || 'Could not add member(s) to group. Please try again.'
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={onClose} hitSlop={10} style={s.iconBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerTitle}>Add Members</Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {groupName} · {selectedIds.length} selected
              </Text>
            </View>
            <Pressable
              onPress={() => void handleAdd()}
              disabled={selectedIds.length === 0 || addMembersMutation.isPending}
              style={[
                s.addBtn,
                (selectedIds.length === 0 || addMembersMutation.isPending) && s.disabledBtn,
              ]}
            >
              {addMembersMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s.addBtnText}>Add</Text>
              )}
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search team members..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            )}
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={s.centerBox}>
              <Loader size={36} color="#818cf8" />
            </View>
          ) : availableUsers.length === 0 ? (
            <View style={s.centerBox}>
              <Ionicons name="people-outline" size={42} color="rgba(255,255,255,0.25)" />
              <Text style={s.emptyText}>
                {search ? 'No members match your search.' : 'All workspace users are already in this group.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() => toggleSelect(item.id)}
                    style={[s.userRow, isSelected && s.selectedRow]}
                  >
                    <Avatar name={item.name} url={item.profile_pic_url} size={44} />

                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.userName}>{item.name}</Text>
                      <Text style={s.userEmail} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>

                    <View
                      style={[
                        s.checkbox,
                        isSelected && s.checkedBox,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#ffffff',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedRow: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
});
