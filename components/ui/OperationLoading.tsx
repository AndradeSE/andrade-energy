import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme";

export default function OperationLoading({ visible, title }: { visible: boolean; title: string }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel={title}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.caption}>Aguarde a conclusão. Não precisa tocar novamente.</Text>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.3)" },
  card: { width: "100%", maxWidth: 360, padding: 24, borderRadius: 20, backgroundColor: Colors.surface, alignItems: "center", gap: 14 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text, textAlign: "center" },
  caption: { fontSize: 14, color: Colors.subtitle, textAlign: "center" },
});
