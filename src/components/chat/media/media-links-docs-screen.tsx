import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaTab } from './media-tab';
import { LinksTab } from './links-tab';
import { DocsTab } from './docs-tab';
import { resolveAttachmentType } from '@/lib/message-preview';
import type { DirectMessage, MessageAttachment } from '@/hooks/use-direct-messages';

export type TabKey = 'media' | 'links' | 'docs';

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'media', label: 'Media', icon: 'images' },
  { key: 'links', label: 'Links', icon: 'link' },
  { key: 'docs', label: 'Docs', icon: 'document-text' },
];

export function MediaLinksDocsScreen({
  visible,
  messages,
  chatName,
  onClose,
  onPressMedia,
  onJumpToMessage,
}: {
  visible: boolean;
  messages: DirectMessage[];
  chatName: string;
  onClose: () => void;
  onPressMedia: (attachment: MessageAttachment, index: number) => void;
  onJumpToMessage?: (messageUuid: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('media');
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedUuids.size > 0;

  const slideAnim = useRef(new Animated.Value(1000)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / 3;

  useEffect(() => {
    if (visible) {
      setActiveTab('media');
      setSelectedUuids(new Set());
      slideAnim.setValue(1000);
      tabIndicatorX.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    }
  }, [visible, slideAnim, tabIndicatorX]);

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    Animated.spring(tabIndicatorX, {
      toValue: idx * tabWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
    }).start();
  }, [activeTab, tabWidth, tabIndicatorX]);

  function animateClose() {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  function toggleSelect(uuid: string) {
    setSelectedUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  }

  // Count items for tab counts
  const mediaCount = useMemo(() => {
    let count = 0;
    for (const msg of messages) {
      for (const att of msg.attachments) {
        const type = resolveAttachmentType(att);
        if (type === 'image' || type === 'gif' || type === 'video') {
          count++;
        }
      }
    }
    return count;
  }, [messages]);

  const docsCount = useMemo(() => {
    let count = 0;
    for (const msg of messages) {
      for (const att of msg.attachments) {
        if (resolveAttachmentType(att) === 'document') count++;
      }
    }
    return count;
  }, [messages]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <Animated.View
        className="flex-1 bg-[#111111]"
        style={{ transform: [{ translateY: slideAnim }], paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-white/8 px-4 pb-3">
          <Pressable
            onPress={isSelectionMode ? () => setSelectedUuids(new Set()) : animateClose}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons
              name={isSelectionMode ? 'close' : 'chevron-back'}
              size={24}
              color="#ffffff"
            />
          </Pressable>

          <View className="flex-1">
            {isSelectionMode ? (
              <Text className="text-[18px] font-bold text-white">
                {selectedUuids.size} selected
              </Text>
            ) : (
              <>
                <Text className="text-[17px] font-bold text-white">{chatName}</Text>
                <Text className="text-[12px] text-white/40">Media, links, and docs</Text>
              </>
            )}
          </View>
        </View>

        {/* Tab Bar */}
        <View className="relative border-b border-white/8 bg-[#161616]">
          <View className="flex-row">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count =
                tab.key === 'media'
                  ? mediaCount
                  : tab.key === 'docs'
                    ? docsCount
                    : null;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5"
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? '#60a5fa' : 'rgba(255,255,255,0.35)'}
                  />
                  <Text
                    className={`text-[13px] font-semibold ${
                      isActive ? 'text-[#60a5fa]' : 'text-white/35'
                    }`}
                  >
                    {tab.label}
                  </Text>
                  {count !== null && count > 0 ? (
                    <View
                      className="min-w-[20px] items-center rounded-full px-1.5 py-0.5"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(96,165,250,0.18)'
                          : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isActive ? 'text-[#60a5fa]' : 'text-white/30'
                        }`}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Animated underline indicator */}
          <Animated.View
            className="absolute bottom-0 h-[2.5px] rounded-full bg-[#60a5fa]"
            style={{
              width: tabWidth * 0.6,
              transform: [{ translateX: Animated.add(tabIndicatorX, tabWidth * 0.2) }],
            }}
          />
        </View>

        {/* Tab Content */}
        <View className="flex-1">
          {activeTab === 'media' ? (
            <MediaTab
              messages={messages}
              onPressMedia={onPressMedia}
              selectedUuids={selectedUuids}
              onToggleSelect={toggleSelect}
              isSelectionMode={isSelectionMode}
            />
          ) : activeTab === 'links' ? (
            <LinksTab messages={messages} onJumpToMessage={onJumpToMessage} />
          ) : (
            <DocsTab messages={messages} />
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}
