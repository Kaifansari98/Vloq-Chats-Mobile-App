import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGroupDetails } from '@/hooks/use-group-chats';
import { useAuth } from '@/hooks/use-auth';
import { CreateGroupModal } from '@/components/chat/create-group-modal';
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

type GroupParticipant = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  profile_pic_url?: string | null;
};

type GroupInfoModalProps = {
  visible: boolean;
  groupUuid: string;
  groupName: string;
  onClose: () => void;
};

export function GroupInfoModal({
  visible,
  groupUuid,
  groupName,
  onClose,
}: GroupInfoModalProps) {
  const { user: currentUser } = useAuth();
  const { data: groupDetails, isLoading } = useGroupDetails(groupUuid);
  const [searchMember, setSearchMember] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);

  const participants = useMemo(() => {
    return groupDetails?.participants ?? [];
  }, [groupDetails]);

  const filteredParticipants = useMemo(() => {
    if (!searchMember.trim()) return participants;
    const query = searchMember.toLowerCase();
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query)
    );
  }, [participants, searchMember]);

  function handleStartDirectChat(participant: GroupParticipant) {
    if (participant.uuid === currentUser?.uuid) return;
    
    void Haptics.selectionAsync();
    onClose();
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: participant.uuid,
        isGroup: '0',
        memberId: String(participant.id),
        name: participant.name,
        profilePicUrl: participant.profile_pic_url || '',
      },
    });
  }

  function handleExitGroup() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Exit Group',
      `Are you sure you want to exit "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            onClose();
            router.replace('/(app)/(tabs)');
          },
        },
      ]
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={s.modalContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            
            {/* Header bar */}
            <View style={s.headerBar}>
              <Pressable onPress={onClose} hitSlop={10} style={s.iconBtn}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </Pressable>

              <Text style={s.headerTitle}>Group Info</Text>

              <Pressable
                onPress={() => Alert.alert('Edit Group', 'Group settings coming soon!')}
                hitSlop={10}
                style={s.iconBtn}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Group Hero Section */}
              <View style={s.heroSection}>
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.groupAvatarLarge}
                >
                  <Ionicons name="people" size={54} color="#ffffff" />
                </LinearGradient>

                <Text style={s.groupTitleText}>{groupName}</Text>
                <Text style={s.groupSubText}>
                  Group · {participants.length > 0 ? `${participants.length} members` : 'Loading details...'}
                </Text>
              </View>

              {/* Quick Action Buttons */}
              <View style={s.actionRow}>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push('/(app)/create-group');
                  }}
                  style={s.actionCard}
                >
                  <View style={s.actionIconBox}>
                    <Ionicons name="person-add-outline" size={20} color="#60a5fa" />
                  </View>
                  <Text style={s.actionLabel}>Add</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    onClose();
                  }}
                  style={s.actionCard}
                >
                  <View style={s.actionIconBox}>
                    <Ionicons name="search-outline" size={20} color="#60a5fa" />
                  </View>
                  <Text style={s.actionLabel}>Search</Text>
                </Pressable>
              </View>

              {/* Group Description / Info Card */}
              <View style={s.cardContainer}>
                <Text style={s.cardLabel}>GROUP DESCRIPTION</Text>
                <Text style={s.descriptionText}>
                  Official project & team discussion workspace for {groupName}.
                </Text>
                <Text style={s.createdInfoText}>Created by Admin</Text>
              </View>

              {/* Media, Docs & Settings Card */}
              <View style={s.cardContainer}>
                <Pressable
                  onPress={() => Alert.alert('Media Gallery', 'Opening group files & media...')}
                  style={s.rowItem}
                >
                  <Ionicons name="images-outline" size={20} color="#818cf8" />
                  <Text style={s.rowText}>Media, links, and docs</Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                </Pressable>

                <View style={s.divider} />

                <View style={s.rowItem}>
                  <Ionicons name="notifications-outline" size={20} color="#818cf8" />
                  <Text style={s.rowText}>Mute notifications</Text>
                  <Switch
                    value={isMuted}
                    onValueChange={setIsMuted}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#6366f1' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {/* Members Section Header */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>
                  {participants.length} MEMBERS
                </Text>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push('/(app)/create-group');
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="person-add" size={18} color="#60a5fa" />
                </Pressable>
              </View>

              {/* Search Member Input */}
              {participants.length > 3 && (
                <View style={s.searchWrap}>
                  <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search member..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={searchMember}
                    onChangeText={setSearchMember}
                    autoCorrect={false}
                  />
                  {searchMember.length > 0 && (
                    <Pressable onPress={() => setSearchMember('')}>
                      <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Add Member Row Button */}
              <Pressable
                onPress={() => {
                  onClose();
                  router.push('/(app)/create-group');
                }}
                style={s.addMemberRow}
              >
                <View style={s.addMemberIconCircle}>
                  <Ionicons name="person-add" size={18} color="#ffffff" />
                </View>
                <Text style={s.addMemberText}>Add Members</Text>
              </Pressable>

              {/* Participant List */}
              <View style={s.cardContainer}>
                {filteredParticipants.map((p, idx) => {
                  const isSelf = p.uuid === currentUser?.uuid;
                  return (
                    <React.Fragment key={p.id}>
                      {idx > 0 && <View style={s.divider} />}
                      <Pressable
                        onPress={() => handleStartDirectChat(p)}
                        style={s.participantRow}
                      >
                        {p.profile_pic_url ? (
                          <Image
                            source={{ uri: p.profile_pic_url }}
                            style={s.avatarImg}
                          />
                        ) : (
                          <View
                            style={[
                              s.avatarCircle,
                              { backgroundColor: getAvatarColor(p.id) },
                            ]}
                          >
                            <Text style={s.avatarText}>
                              {getInitials(p.name)}
                            </Text>
                          </View>
                        )}

                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={s.participantName}>{p.name}</Text>
                            {isSelf && (
                              <View style={s.youBadge}>
                                <Text style={s.youBadgeText}>You</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.participantEmail} numberOfLines={1}>
                            {p.email}
                          </Text>
                        </View>

                        {idx === 0 && (
                          <View style={s.adminBadge}>
                            <Text style={s.adminBadgeText}>Admin</Text>
                          </View>
                        )}
                      </Pressable>
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Danger Zone: Exit Group */}
              <View style={[s.cardContainer, { marginTop: 24 }]}>
                <Pressable onPress={handleExitGroup} style={s.rowItem}>
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                  <Text style={[s.rowText, { color: '#ef4444', fontWeight: '600' }]}>
                    Exit group
                  </Text>
                </Pressable>

                <View style={s.divider} />

                <Pressable
                  onPress={() =>
                    Alert.alert('Reported', 'Thank you. We will review this group.')
                  }
                  style={s.rowItem}
                >
                  <Ionicons name="thumbs-down-outline" size={22} color="#ef4444" />
                  <Text style={[s.rowText, { color: '#ef4444' }]}>
                    Report group
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Embedded Create/Add Group Modal */}
      <CreateGroupModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  groupAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  groupTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  groupSubText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionCard: {
    alignItems: 'center',
    width: 70,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60a5fa',
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  createdInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    marginLeft: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#ffffff',
  },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addMemberIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 14,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  participantEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818cf8',
  },
  adminBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
});
