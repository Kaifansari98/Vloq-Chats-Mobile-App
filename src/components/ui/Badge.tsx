import React from "react";
import { View, Text, StyleSheet } from "react-native";

type BadgeProps = {
  count: number;
  size?: number;
};

export function Badge({ count, size = 20 }: BadgeProps) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <View style={[styles.badge, { minWidth: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  text: {
    color: "#fff",
    fontWeight: "700",
  },
});
