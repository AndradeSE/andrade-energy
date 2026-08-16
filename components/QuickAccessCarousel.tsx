import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../theme";

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function QuickAccessCarousel({ items }: { items: Item[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" style={styles.scroll} contentContainerStyle={styles.content}>
      {items.map((item) => (
        <Pressable accessibilityLabel={item.label} key={item.label} onPress={item.onPress} style={styles.card}>
          <View style={styles.icon}><Ionicons name={item.icon} size={24} color={Colors.primary} /></View>
          <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -Spacing.lg },
  content: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  card: { width: 108, minHeight: 104, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xs, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: "#DEE0E3" },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  label: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.small, fontWeight: "700", textAlign: "center" },
});
