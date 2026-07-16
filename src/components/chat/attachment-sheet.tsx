import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

const GALLERY_PAGE_SIZE = 60;

export type PickedAttachment = {
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'file';
};

type QuickActionKey = 'photos' | 'camera' | 'document' | 'contact';

export function AttachmentSheet({
  visible,
  onClose,
  onPickLibrary,
  onPickCamera,
  onPickDocument,
  onSelectAsset,
}: {
  visible: boolean;
  onClose: () => void;
  onPickLibrary: () => void;
  onPickCamera: () => void;
  onPickDocument: () => void;
  onSelectAsset: (attachment: PickedAttachment) => void;
}) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    async function loadGallery() {
      setLoadErrorMessage(null);
      let current = permission;
      if (!current || current.status !== 'granted') {
        current = await requestPermission();
      }
      if (current?.status !== 'granted') return;

      setIsLoadingAssets(true);
      try {
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: ['photo'],
          first: GALLERY_PAGE_SIZE,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        setAssets(result.assets);
      } catch (error) {
        console.error('Failed to load gallery assets', error);
        setLoadErrorMessage(error instanceof Error ? error.message : 'Could not load photos.');
      } finally {
        setIsLoadingAssets(false);
      }
    }

    void loadGallery();
    // Only reload when the sheet opens, not on every permission object identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function handleSelectAsset(asset: MediaLibrary.Asset) {
    setSelectingId(asset.id);
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      onSelectAsset({
        uri: info.localUri ?? asset.uri,
        name: asset.filename,
        type: 'image/jpeg',
        kind: 'image',
      });
      onClose();
    } finally {
      setSelectingId(null);
    }
  }

  function handleQuickAction(key: QuickActionKey) {
    if (key === 'photos') onPickLibrary();
    else if (key === 'camera') onPickCamera();
    else if (key === 'document') onPickDocument();
    else return;
    onClose();
  }

  const quickActions: Array<{
    key: QuickActionKey;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    bgColor: string;
  }> = [
    {
      key: 'photos',
      label: 'Photos',
      icon: 'images',
      iconColor: '#60a5fa',
      bgColor: 'rgba(96,165,250,0.15)',
    },
    {
      key: 'camera',
      label: 'Camera',
      icon: 'camera',
      iconColor: '#ffffff',
      bgColor: 'rgba(255,255,255,0.1)',
    },
    {
      key: 'document',
      label: 'Document',
      icon: 'document-text',
      iconColor: '#818cf8',
      bgColor: 'rgba(129,140,248,0.15)',
    },
    {
      key: 'contact',
      label: 'Contact',
      icon: 'person',
      iconColor: 'rgba(255,255,255,0.85)',
      bgColor: 'rgba(255,255,255,0.1)',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="rounded-t-3xl bg-[#161616] pb-6 pt-2.5" style={{ maxHeight: '78%' }}>
          <View className="items-center pb-3">
            <View className="h-1 w-10 rounded-full bg-white/25" />
          </View>

          <View className="flex-row justify-around px-4 pb-5">
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => handleQuickAction(action.key)}
                className="items-center gap-1.5"
                hitSlop={4}
              >
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: action.bgColor }}
                >
                  <Ionicons name={action.icon} size={24} color={action.iconColor} />
                </View>
                <Text className="text-[12px] text-white/70">{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-1 border-t border-white/8 px-3 pt-4">
            {permission && permission.status !== 'granted' ? (
              <View className="items-center px-6 py-10">
                <Ionicons name="images-outline" size={28} color="rgba(255,255,255,0.35)" />
                <Text className="mt-3 text-center text-[13px] text-white/50">
                  Allow photo access to see your gallery here.
                </Text>
              </View>
            ) : isLoadingAssets ? (
              <View className="items-center py-10">
                <ActivityIndicator color="rgba(255,255,255,0.5)" />
              </View>
            ) : loadErrorMessage ? (
              <View className="items-center px-6 py-10">
                <Ionicons name="alert-circle-outline" size={28} color="rgba(255,255,255,0.35)" />
                <Text className="mt-3 text-center text-[13px] text-white/50">
                  {loadErrorMessage}
                </Text>
              </View>
            ) : assets.length === 0 ? (
              <View className="items-center px-6 py-10">
                <Ionicons name="images-outline" size={28} color="rgba(255,255,255,0.35)" />
                <Text className="mt-3 text-center text-[13px] text-white/50">
                  {permission?.accessPrivileges === 'limited'
                    ? "You've only given Vloq Chats access to a few photos. Update access in Settings to see more here."
                    : 'No photos found on this device.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={assets}
                numColumns={4}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={{ gap: 4 }}
                contentContainerStyle={{ gap: 4, paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => void handleSelectAsset(item)}
                    disabled={selectingId !== null}
                    className="aspect-square flex-1 overflow-hidden rounded-md bg-white/5"
                  >
                    <Image
                      source={item.uri}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    {selectingId === item.id ? (
                      <View className="absolute inset-0 items-center justify-center bg-black/40">
                        <ActivityIndicator color="#ffffff" size="small" />
                      </View>
                    ) : null}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
