import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroupMedia, type GroupMediaItem } from '@/hooks/use-group-chats';
import { Loader } from '@/components/ui/Loader';
import { COLORS } from '@/constants/theme';
import { formatFileSize } from '@/lib/utils';

type GroupMediaModalProps = {
  visible: boolean;
  groupUuid: string;
  groupName: string;
  onClose: () => void;
};

type TabType = 'media' | 'docs' | 'links';

export function GroupMediaModal({
  visible,
  groupUuid,
  groupName,
  onClose,
}: GroupMediaModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const { data: mediaItems = [], isLoading } = useGroupMedia(groupUuid, activeTab);

  function handleOpenLink(url: string) {
    void Linking.openURL(url).catch((err) =>
      console.warn('Could not open link:', err)
    );
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
              <Text style={s.headerTitle}>Media, links and docs</Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {groupName}
              </Text>
            </View>
          </View>

          {/* Custom Segmented Tabs */}
          <View style={s.tabBar}>
            {(['media', 'docs', 'links'] as TabType[]).map((tab) => {
              const isActive = activeTab === tab;
              const label =
                tab === 'media'
                  ? 'Media'
                  : tab === 'docs'
                    ? 'Docs'
                    : 'Links';
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[s.tabItem, isActive && s.activeTabItem]}
                >
                  <Text style={[s.tabText, isActive && s.activeTabText]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Main List */}
          {isLoading ? (
            <View style={s.centerBox}>
              <Loader size={36} color="#818cf8" />
            </View>
          ) : mediaItems.length === 0 ? (
            <View style={s.centerBox}>
              <Ionicons
                name={
                  activeTab === 'media'
                    ? 'images-outline'
                    : activeTab === 'docs'
                      ? 'document-text-outline'
                      : 'link-outline'
                }
                size={48}
                color="rgba(255,255,255,0.2)"
              />
              <Text style={s.emptyText}>
                {activeTab === 'media'
                  ? 'No photos or videos shared in this group yet.'
                  : activeTab === 'docs'
                    ? 'No documents shared in this group yet.'
                    : 'No links shared in this group yet.'}
              </Text>
            </View>
          ) : activeTab === 'media' ? (
            /* Media Grid */
            <FlatList
              data={mediaItems}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 4 }}
              renderItem={({ item }) => (
                <View style={s.mediaCell}>
                  {item.type === 'IMAGE' ? (
                    <Image source={{ uri: item.url }} style={s.mediaThumb} />
                  ) : (
                    <View style={s.videoCell}>
                      <Ionicons name="videocam" size={28} color="#ffffff" />
                    </View>
                  )}
                </View>
              )}
            />
          ) : activeTab === 'docs' ? (
            /* Docs List */
            <FlatList
              data={mediaItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => (
                <View style={s.docRow}>
                  <View style={s.docIconCircle}>
                    <Ionicons name="document-text" size={20} color="#818cf8" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={s.docName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={s.docMeta}>
                      {formatFileSize(item.sizeBytes)} · {item.senderName}
                    </Text>
                  </View>
                  {item.url ? (
                    <Pressable
                      onPress={() => handleOpenLink(item.url)}
                      hitSlop={8}
                      style={s.downloadBtn}
                    >
                      <Ionicons name="cloud-download-outline" size={20} color="#60a5fa" />
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          ) : (
            /* Links List */
            <FlatList
              data={mediaItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleOpenLink(item.url)}
                  style={s.linkRow}
                >
                  <View style={s.linkIconCircle}>
                    <Ionicons name="link" size={20} color="#34d399" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={s.linkUrl} numberOfLines={2}>
                      {item.url}
                    </Text>
                    <Text style={s.linkSender}>Shared by {item.senderName}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.3)" />
                </Pressable>
              )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  activeTabText: {
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
    lineHeight: 20,
  },
  mediaCell: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  videoCell: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  docIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  docMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  linkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkUrl: {
    fontSize: 14,
    fontWeight: '500',
    color: '#60a5fa',
  },
  linkSender: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
});
