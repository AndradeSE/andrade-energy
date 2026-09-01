import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type Option<T extends string> = { label: string; value: T };

export default function ChoiceField<T extends string>({ label, options, value, onChange, disabled = false }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable disabled={disabled} key={option.value} onPress={() => onChange(option.value)} style={[styles.option, value === option.value && styles.selected, disabled && styles.disabled]}>
            <Text style={[styles.text, value === option.value && styles.selectedText, disabled && styles.disabledText]}>{option.label}</Text>
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
  disabled: { opacity: 0.55 },
  disabledText: { color: Colors.subtitle },
});
