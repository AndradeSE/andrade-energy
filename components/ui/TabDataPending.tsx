import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing, Typography } from "../../theme";

/** Discreet fallback inside a mounted tab; the animated splash is only for app startup. */
export default function TabDataPending() {
  return <View accessibilityLabel="Preparando dados da seção" style={styles.container}>
    <Text style={styles.label}>Preparando dados desta seção…</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg },
  label: { color: Colors.subtitle, fontSize: Typography.small },
});
