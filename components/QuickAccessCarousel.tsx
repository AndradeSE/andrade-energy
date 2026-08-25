import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { Colors, Radius, Spacing, Typography } from "../theme";

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: boolean;
  value?: string;
};

type Props = {
  items: Item[];
};

export default function QuickAccessCarousel({ items }: Props) {
  return (
    <ScrollView
      horizontal
      alwaysBounceHorizontal={false}
      bounces={false}
      decelerationRate="fast"
      directionalLockEnabled
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {items.map((item) => (
        <Pressable accessibilityLabel={item.label} key={item.label} onPress={item.onPress} style={styles.card}>
          {item.badge ? <View style={styles.badge}><Text style={styles.badgeText}>NOVO</Text></View> : null}
          <View style={styles.icon}><Ionicons name={item.icon} size={24} color={Colors.primary} /></View>
          <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
          {item.value ? <Text numberOfLines={1} style={styles.value}>{item.value}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -Spacing.lg },
  content: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  card: { width: 118, minHeight: 112, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xs, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: "#DEE0E3" },
  badge: { position: "absolute", top: 7, right: 7, zIndex: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.round, backgroundColor: "#E11D48" },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  label: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.small, fontWeight: "700", textAlign: "center" },
  value: { marginTop: 2, color: Colors.primary, fontSize: 11, fontWeight: "800" },
});
