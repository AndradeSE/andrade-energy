import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../theme";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
const options: { value: PixKeyType; label: string }[] = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "EVP", label: "Chave aleatória" },
];

export default function PixKeyTypeSelector({ value, onChange }: { value: PixKeyType; onChange: (value: PixKeyType) => void }) {
  const [visible, setVisible] = useState(false);
  const label = options.find((option) => option.value === value)!.label;
  return (
    <View>
      <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Tipo de chave Pix: ${label}. Alterar tipo`}
      style={styles.control}
      onPress={() => setVisible(true)}
    >
      <Text style={styles.text}>Tipo de chave: {label} ▾</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.text}>Tipo de chave Pix</Text>
            {options.map((option) => (
              <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} style={styles.control} onPress={() => { onChange(option.value); setVisible(false); }}>
                <Text style={styles.text}>{option.label}{value === option.value ? " ✓" : ""}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity accessibilityRole="button" style={styles.control} onPress={() => setVisible(false)}><Text style={styles.text}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  control: { paddingVertical: 12, marginBottom: 8 },
  text: { color: Colors.primary, fontWeight: "600", fontSize: 16 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: "white", padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
