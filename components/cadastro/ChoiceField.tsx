import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type Option<T extends string> = { label: string; value: T };

export default function ChoiceField<T extends string>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.option, value === option.value && styles.selected]}>
            <Text style={[styles.text, value === option.value && styles.selectedText]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  option: { flexGrow: 1, alignItems: "center", padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  text: { color: Colors.subtitle, fontWeight: "600" },
  selectedText: { color: Colors.primaryDark, fontWeight: "700" },
});
