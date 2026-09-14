import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { splitMessageLinks } from '@/lib/message-links';
import { showDialog } from '@/components/ui/app-dialog';

export function MessageText({ content, isOwn }: { content: string; isOwn: boolean }) {
  const parts = useMemo(() => splitMessageLinks(content), [content]);
  const firstLink = parts.find((part) => part.url);
  const [faviconFailed, setFaviconFailed] = useState(false);

  // Accompanying text before the link
  const contextTitle = useMemo(() => {
    const textPart = parts.find((p) => !p.url && p.text.trim().length > 0);
    return textPart ? textPart.text.trim() : null;
  }, [parts]);

  async function openLink(url: string) {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(url);
    } catch {
      showDialog('Could not open link', 'Please check that a browser is available and try again.');
    }
  }

  // Truncated clean URL for preview card
  const displayUrl = useMemo(() => {
    if (!firstLink?.url) return '';
    try {
      const parsed = new URL(firstLink.url);
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      return `${parsed.hostname}${path}${parsed.search}`.slice(0, 48);
    } catch {
      return firstLink.hostname ?? firstLink.url;
    }
  }, [firstLink]);

  return (
    <View style={{ width: '100%' }}>
      {/* 1. Message text with clean clickable links */}
      <Text
        style={{
          fontSize: 15,
          lineHeight: 21,
          color: isOwn ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {parts.map((part, index) =>
          part.url ? (
            <Text
              key={index}
              accessibilityRole="link"
              accessibilityLabel={part.text}
              style={{
                color: '#38bdf8',
                fontWeight: '500',
              }}
              onPress={(event) => {
                event.stopPropagation();
                void openLink(part.url!);
              }}
            >
              {part.text}
            </Text>
          ) : (
            <Text key={index}>{part.text}</Text>
          )
        )}
      </Text>

      {/* 2. Modern Telegram/WhatsApp style Link Preview Card */}
      {firstLink?.url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${firstLink.hostname}`}
          onPress={(event) => {
            event.stopPropagation();
            void openLink(firstLink.url!);
          }}
          style={({ pressed }) => ({
            marginTop: 8,
            borderRadius: 12,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'stretch',
            backgroundColor: pressed
              ? 'rgba(0, 0, 0, 0.35)'
              : isOwn
              ? 'rgba(0, 0, 0, 0.22)'
              : 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
          })}
        >
          {/* Left vertical accent stripe */}
          <View
            style={{
              width: 3.5,
              backgroundColor: '#38bdf8',
            }}
          />

          {/* Card Body */}
          <View
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 10,
              justifyContent: 'center',
            }}
          >
            {/* Domain & Favicon header row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {!faviconFailed && firstLink.hostname ? (
                  <ExpoImage
                    source={{
                      uri: `https://www.google.com/s2/favicons?domain=${firstLink.hostname}&sz=64`,
                    }}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      marginRight: 6,
                    }}
                    contentFit="contain"
                    onError={() => setFaviconFailed(true)}
                  />
                ) : (
                  <View
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: 3,
                      backgroundColor: 'rgba(56, 189, 248, 0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 6,
                    }}
                  >
                    <Ionicons name="globe-outline" size={10} color="#38bdf8" />
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#38bdf8',
                    letterSpacing: 0.2,
                  }}
                >
                  {firstLink.hostname}
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={13}
                color="rgba(255, 255, 255, 0.45)"
              />
            </View>

            {/* Context Title if present */}
            {contextTitle ? (
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.92)',
                  marginTop: 3,
                  lineHeight: 18,
                }}
              >
                {contextTitle}
              </Text>
            ) : null}

            {/* Subtitle / URL snippet */}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.45)',
                marginTop: contextTitle ? 2 : 4,
              }}
            >
              {displayUrl}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
