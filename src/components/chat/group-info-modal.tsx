import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useGroupDetails,
  useRemoveGroupMember,
  type GroupParticipantFull,
} from '@/hooks/use-group-chats';
import { useAuth } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui/Avatar';
import { AddMemberModal } from '@/components/chat/add-member-modal';
import { GroupMediaModal } from '@/components/chat/group-media-modal';
import { Loader } from '@/components/ui/Loader';
import { COLORS } from '@/constants/theme';

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
  const removeMemberMutation = useRemoveGroupMember(groupUuid);

  const [searchMember, setSearchMember] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<GroupParticipantFull | null>(null);

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

  const isSelfUser = (participant: GroupParticipantFull) => {
    if (!currentUser) return false;
    return participant.uuid === currentUser.uuid || (currentUser as any).id === participant.id;
  };

  // Check if current user is admin of the group
  const isCurrentUserAdmin = useMemo(() => {
    if (!currentUser || !groupDetails) return false;
    const me = participants.find((p) => isSelfUser(p));
    return me?.isAdmin ?? (groupDetails.creatorId === (currentUser as any).id);
  }, [currentUser, groupDetails, participants]);

  function handleStartDirectChat(participant: GroupParticipantFull) {
    if (isSelfUser(participant)) return;
    
    void Haptics.selectionAsync();
    setSelectedParticipant(null);
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

  async function handleRemoveMember(participant: GroupParticipantFull) {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await removeMemberMutation.mutateAsync(participant.id);
      setSelectedParticipant(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
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
          onPress: async () => {
            if (currentUser) {
              try {
                const me = participants.find((p) => isSelfUser(p));
                if (me) {
                  await removeMemberMutation.mutateAsync(me.id);
                }
              } catch (err) {
                console.error('Failed to exit group:', err);
              }
            }
            onClose();
            router.replace('/(app)/(tabs)');
          },
        },
      ]
    );
  }

  const mediaCountTotal = (groupDetails?.mediaCount ?? 0) + (groupDetails?.docsCount ?? 0) + (groupDetails?.linksCount ?? 0);

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
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
              </Pressable>

              <Text style={s.headerTitle}>Group Info</Text>

              <View style={{ width: 36 }} />
            </View>

            {isLoading ? (
              <View style={s.loadingBox}>
                <Loader size={36} color="#818cf8" />
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Hero Section (WhatsApp Style) */}
                <View style={s.heroSection}>
                  <LinearGradient
                    colors={['#6366f1', '#4f46e5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.groupAvatarLarge}
                  >
                    {groupDetails?.avatarUrl ? (
                      <Image source={{ uri: groupDetails.avatarUrl }} style={s.avatarImgLarge} />
                    ) : (
                      <Ionicons name="people" size={54} color="#ffffff" />
                    )}
                  </LinearGradient>

                  <Text style={s.groupTitleText}>{groupDetails?.name ?? groupName}</Text>
                  <Text style={s.groupSubText}>
                    Group · {participants.length} participants
                  </Text>
                </View>

                {/* Quick Action Bar */}
                <View style={s.actionRow}>
                  <Pressable
                    onPress={() => setIsAddMemberOpen(true)}
                    style={s.actionCard}
                  >
                    <View style={s.actionIconBox}>
                      <Ionicons name="person-add-outline" size={20} color="#10b981" />
                    </View>
                    <Text style={[s.actionLabel, { color: '#10b981' }]}>Add</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSearchMember((prev) => (prev ? '' : ' '))}
                    style={s.actionCard}
                  >
                    <View style={s.actionIconBox}>
                      <Ionicons name="search-outline" size={20} color="#60a5fa" />
                    </View>
                    <Text style={s.actionLabel}>Search</Text>
                  </Pressable>
                </View>

                {/* Group Description Card */}
                <View style={s.cardContainer}>
                  <Text style={s.cardLabel}>DESCRIPTION</Text>
                  <Text style={s.descriptionText}>
                    Official discussion & workspace channel for {groupDetails?.name ?? groupName}.
                  </Text>
                  <Text style={s.createdInfoText}>
                    Created on {groupDetails?.createdAt ? new Date(groupDetails.createdAt).toLocaleDateString() : 'Vloq Workspace'}
                  </Text>
                </View>

                {/* Media, Links & Docs Card (Clean Tap Row) */}
                <View style={s.cardContainer}>
                  <Pressable
                    onPress={() => setIsMediaModalOpen(true)}
                    style={s.rowItem}
                  >
                    <View style={s.rowIconCircle}>
                      <Ionicons name="images-outline" size={20} color="#818cf8" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.rowText}>Media, links, and docs</Text>
                      <Text style={s.rowSubtext}>
                        {mediaCountTotal > 0
                          ? `${groupDetails?.mediaCount ?? 0} photos/videos · ${groupDetails?.docsCount ?? 0} docs · ${groupDetails?.linksCount ?? 0} links`
                          : 'None shared yet'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                  </Pressable>
                </View>

                {/* Members Section Header */}
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>
                    {participants.length} PARTICIPANTS
                  </Text>
                  <Pressable
                    onPress={() => setIsAddMemberOpen(true)}
                    hitSlop={8}
                    style={s.addSmallBtn}
                  >
                    <Ionicons name="person-add" size={16} color="#10b981" />
                    <Text style={s.addSmallBtnText}>Add</Text>
                  </Pressable>
                </View>

                {/* Search Member Input */}
                <View style={s.searchWrap}>
                  <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search participant..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={searchMember.trim()}
                    onChangeText={setSearchMember}
                    autoCorrect={false}
                  />
                  {searchMember.length > 0 && (
                    <Pressable onPress={() => setSearchMember('')}>
                      <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  )}
                </View>

                {/* WhatsApp Style "+ Add Members" Row */}
                <Pressable
                  onPress={() => setIsAddMemberOpen(true)}
                  style={s.addMemberRow}
                >
                  <View style={s.addMemberIconCircle}>
                    <Ionicons name="person-add" size={18} color="#ffffff" />
                  </View>
                  <Text style={s.addMemberText}>Add Members</Text>
                </Pressable>

                {/* Participant List (WhatsApp Style) */}
                <View style={s.cardContainer}>
                  {filteredParticipants.map((p, idx) => {
                    const isSelf = isSelfUser(p);
                    return (
                      <React.Fragment key={p.id}>
                        {idx > 0 && <View style={s.divider} />}
                        <Pressable
                          onPress={() => setSelectedParticipant(p)}
                          style={s.participantRow}
                        >
                          <Avatar name={p.name} url={p.profile_pic_url} size={42} />

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

                          {p.isAdmin && (
                            <View style={s.adminBadge}>
                              <Text style={s.adminBadgeText}>Group Admin</Text>
                            </View>
                          )}
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* Danger Zone: Exit Group */}
                <View style={[s.cardContainer, { marginTop: 20 }]}>
                  <Pressable onPress={handleExitGroup} style={s.rowItem}>
                    <View style={[s.rowIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    </View>
                    <Text style={[s.rowText, { color: '#ef4444', fontWeight: '600' }]}>
                      Exit group
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Embedded Add Members Modal */}
      <AddMemberModal
        visible={isAddMemberOpen}
        groupUuid={groupUuid}
        groupName={groupName}
        existingParticipants={participants}
        onClose={() => setIsAddMemberOpen(false)}
      />

      {/* Embedded Group Media Modal */}
      <GroupMediaModal
        visible={isMediaModalOpen}
        groupUuid={groupUuid}
        groupName={groupName}
        onClose={() => setIsMediaModalOpen(false)}
      />

      {/* Participant Options Bottom Sheet */}
      <Modal
        visible={selectedParticipant !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedParticipant(null)}
      >
        <View style={s.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedParticipant(null)} />
          <View style={s.sheetContent}>
            <View style={s.sheetHandle} />

            {selectedParticipant ? (
              <>
                <View style={s.sheetHeaderRow}>
                  <Avatar
                    name={selectedParticipant.name}
                    url={selectedParticipant.profile_pic_url}
                    size={48}
                  />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={s.sheetName}>{selectedParticipant.name}</Text>
                    <Text style={s.sheetEmail}>{selectedParticipant.email}</Text>
                  </View>
                </View>

                <View style={s.sheetActions}>
                  {!isSelfUser(selectedParticipant) && (
                    <Pressable
                      onPress={() => handleStartDirectChat(selectedParticipant)}
                      style={s.sheetBtn}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#60a5fa" />
                      <Text style={s.sheetBtnText}>Message {selectedParticipant.name.split(' ')[0]}</Text>
                    </Pressable>
                  )}

                  {isCurrentUserAdmin && !isSelfUser(selectedParticipant) && (
                    <Pressable
                      onPress={() => void handleRemoveMember(selectedParticipant)}
                      disabled={removeMemberMutation.isPending}
                      style={[s.sheetBtn, { backgroundColor: 'rgba(239,68,68,0.12)' }]}
                    >
                      {removeMemberMutation.isPending ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
                      )}
                      <Text style={[s.sheetBtnText, { color: '#ef4444' }]}>
                        {removeMemberMutation.isPending ? 'Removing...' : 'Remove from group'}
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => setSelectedParticipant(null)}
                    style={s.sheetCancelBtn}
                  >
                    <Text style={s.sheetCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  groupAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  avatarImgLarge: {
    width: '100%',
    height: '100%',
  },
  groupTitleText: {
    fontSize: 23,
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
    justifyContent: 'center',
    gap: 32,
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginBottom: 14,
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
    paddingVertical: 4,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  rowSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSmallBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
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

  // Sheet Modal Styles
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheetContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  sheetEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  sheetActions: {
    gap: 10,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 14,
  },
  sheetBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  sheetCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
