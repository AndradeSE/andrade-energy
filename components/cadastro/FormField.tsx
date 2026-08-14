import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type Props = TextInputProps & { label: string };

export default function FormField({ label, ...inputProps }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={Colors.subtitle} style={styles.input} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, color: Colors.text },
});
