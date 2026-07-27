import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS } from "@/constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: "chatbubbles", inactive: "chatbubbles-outline" },
  users: { active: "people", inactive: "people-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
  profile: { active: "person-circle", inactive: "person-circle-outline" },
};

export function TabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const routeCount = state.routes.length;
  const [pillWidth, setPillWidth] = useState(0);
  const itemWidth = pillWidth / routeCount;

  const indicatorAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.6,
    }).start();
  }, [state.index, indicatorAnim]);

  return (
    <View
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, 0) + 2 }]}
      pointerEvents="box-none"
    >
      <View
        style={styles.pill}
        onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}
      >
        {pillWidth > 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: itemWidth - 8,
                transform: [
                  {
                    translateX: indicatorAnim.interpolate({
                      inputRange: state.routes.map((_, i) => i),
                      outputRange: state.routes.map(
                        (_, i) => i * itemWidth + 4,
                      ),
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const icons = ICONS[route.name] ?? ICONS.index;
          const label =
            typeof options.title === "string" ? options.title : route.name;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <TabItem
              key={route.key}
              focused={focused}
              icon={focused ? icons.active : icons.inactive}
              label={label}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      damping: 14,
      stiffness: 200,
    }).start();
  }, [focused, focusAnim]);

  const labelColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.45)", "#ffffff"],
  });

  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={6}>
      <Ionicons
        name={icon}
        size={22}
        color={focused ? "#ffffff" : "rgba(255,255,255,0.45)"}
      />
      <Animated.Text
        numberOfLines={1}
        style={[styles.label, { color: labelColor }]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  pill: {
    flexDirection: "row",
    height: 64,
    borderRadius: 32,
    backgroundColor: `rgba(${COLORS.backgroundRgb}, 0.94)`,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    top: 6,
    left: 0,
    height: 52,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
