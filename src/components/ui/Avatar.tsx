import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { getInitials } from "@/lib/utils";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
  "#22c55e", "#14b8a6", "#3b82f6", "#eab308",
];

function getColor(name: string): string {
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    COLORS.length;
  return COLORS[idx];
}

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: number;
  isGroup?: boolean;
};

export function Avatar({ name, url, size = 44, isGroup = false }: AvatarProps) {
  const bg = isGroup ? "#6366f1" : getColor(name);
  const fontSize = size * 0.38;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
      />
    );
  }

  if (isGroup) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: "#6366f1" },
        ]}
      >
        <Ionicons name="people" size={size * 0.52} color="#ffffff" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#1e293b",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
