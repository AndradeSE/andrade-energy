import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { AppState, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, Screen } from "../ui";
import CadastroActions from "./CadastroActions";
import { useAuth } from "../../contexts/AuthContext";

export default function SharedInvoiceInbox({ enabled }: { enabled: boolean }) {
  const { usuario, usinaSelecionada } = useAuth();
  const [name, setName] = useState("");
  const directory = FileSystem.cacheDirectory + "shared-invoices/";
  useEffect(() => {
    if (!enabled || Platform.OS !== "android") return;
    let active = true;
    let checking = false;
    async function check() {
      if (checking || name) return;
      checking = true;
      try {
        const entries = await FileSystem.readDirectoryAsync(directory);
        const next = entries.find(file => /^[a-f0-9-]{36}\.(pdf|jpg|png)$/.test(file));
        if (!active || !next) return;
        await FileSystem.moveAsync({ from: directory + next, to: FileSystem.cacheDirectory + next });
        if (active) setName(next);
      } catch {
        // The native receiver creates the directory on the first share.
      } finally { checking = false; }
    }
    void check();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    const poll = setInterval(() => { if (AppState.currentState === "active") void check(); }, 1500);
    return () => { active = false; listener.remove(); clearInterval(poll); };
  }, [directory, enabled, name]);
  if (!enabled || !name || usuario?.perfil !== "ADMIN") return null;
  const uri = FileSystem.cacheDirectory + name;
  const extension = name.split(".").pop();
  const mimeType = extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : "image/jpeg";
  const arquivo = { uri, name: "fatura." + extension, mimeType, lastModified: Date.now() };
  function cancelar() {
    void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    setName("");
  }
  function abrirCadastro() {
    // The destination form retains the cache file for its upload.
    setName("");
  }
  return (
    <Modal visible onRequestClose={cancelar} animationType="slide">
      <Screen>
        <AppHeader onBack={cancelar} variant="subpage" title="Fatura compartilhada" subtitle="" contextTitle="" contextSubtitle="" icon="document-attach-outline" showPlantSwitch={false} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}>
                <Ionicons name={extension === "pdf" ? "document-text-outline" : "image-outline"} size={24} color={Colors.primary} />
              </View>
              <View style={styles.fileCopy}>
                <Text style={styles.title}>Arquivo recebido</Text>
                <Text style={styles.description}>{extension === "pdf" ? "Documento PDF" : "Foto da fatura"}</Text>
              </View>
            </View>
            <Text style={styles.description}>Escolha o que deseja cadastrar com este arquivo.</Text>
            <View style={styles.actions}>
              {usinaSelecionada ? <>
                <CadastroActions tipo="CLIENTE" compartilhado={arquivo} onImported={() => setName("")} />
                <CadastroActions tipo="UNIDADE" compartilhado={arquivo} onImported={abrirCadastro} />
              </> : <Text style={styles.description}>Selecione uma usina antes de cadastrar um cliente ou uma UC.</Text>}
              <CadastroActions tipo="USINA" compartilhado={arquivo} onImported={abrirCadastro} />
            </View>
          </Card>
          <Button title="Cancelar" onPress={cancelar} />
        </ScrollView>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.md },
  fileRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  fileIcon: { width: 48, height: 48, borderRadius: Radius.lg, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  fileCopy: { flex: 1 },
  title: { fontSize: Typography.card, fontWeight: "800", color: Colors.text },
  description: { color: Colors.subtitle, fontSize: Typography.small },
  actions: { gap: Spacing.sm },
});