import { useState } from "react";
import { NativeSyntheticEvent, StyleSheet, Text, TextInput, TextInputFocusEventData, TextInputProps, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";
import { emailValido, normalizarEmail } from "../../utils/email";

type Props = TextInputProps & { label: string };

export default function FormField({ label, ...inputProps }: Props) {
  const [emailTocado, setEmailTocado] = useState(false);
  const campoEmail = inputProps.keyboardType === "email-address";
  const emailInvalido = campoEmail && emailTocado && Boolean(inputProps.value) && !emailValido(String(inputProps.value));
  const alterar = (valor: string) => inputProps.onChangeText?.(campoEmail ? normalizarEmail(valor) : valor);
  const sair = (evento: NativeSyntheticEvent<TextInputFocusEventData>) => {
    if (campoEmail) setEmailTocado(true);
    inputProps.onBlur?.(evento);
  };
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} autoCapitalize={campoEmail ? "none" : inputProps.autoCapitalize} autoCorrect={campoEmail ? false : inputProps.autoCorrect} onBlur={sair} onChangeText={alterar} placeholderTextColor={Colors.subtitle} style={[styles.input, inputProps.style, emailInvalido && styles.invalid]} />
      {emailInvalido ? <Text style={styles.error}>Informe um e-mail válido.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, color: Colors.text },
  invalid: { borderColor: Colors.danger },
  error: { marginTop: 5, color: Colors.danger, fontSize: Typography.caption },
});
