import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";

import PdfPasswordRetryModal from "../PdfPasswordRetryModal";
import { useAuth } from "../../contexts/AuthContext";
import { importarProducaoPelaUc } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Pdf = DocumentPicker.DocumentPickerAsset;

export default function ImportarProducaoPdfButton({ onSuccess }: {
  onSuccess?: () => void | Promise<void>;
}) {
  const { suspenderBloqueioTemporariamente } = useAuth();
  const [importando, setImportando] = useState(false);
  const [pdfPendente, setPdfPendente] = useState<Pdf | null>(null);
  const [pedindoSenha, setPedindoSenha] = useState(false);

  async function enviar(pdf: Pdf, senhaPdf?: string) {
    setImportando(true);
    try {
      const resultado = await importarProducaoPelaUc(pdf.uri, pdf.name, senhaPdf);
      setPdfPendente(null);
      setPedindoSenha(false);
      try { await onSuccess?.(); } catch { /* A produção já foi registrada; a lista pode ser atualizada depois. */ }
      const energia = Number(resultado?.dados?.energiaGerada ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
      Alert.alert("Produção atualizada", `${energia} kWh registrados em ${resultado?.usina?.nome ?? "sua usina"} para ${resultado?.dados?.referencia ?? "a competência da fatura"}.`);
    } catch (erro: any) {
      if (erro?.response?.data?.code === "PDF_PASSWORD_REQUIRED" && !senhaPdf) {
        setPdfPendente(pdf);
        setPedindoSenha(true);
        return;
      }
      Alert.alert("Não foi possível importar", erro?.response?.data?.message ?? erro?.message ?? "Confira o PDF e tente novamente.");
    } finally {
      setImportando(false);
    }
  }

  async function escolherPdf() {
    if (importando) return;
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      if (!arquivo.canceled && arquivo.assets?.[0]) await enviar(arquivo.assets[0]);
    } catch (erro: any) {
      Alert.alert("Não foi possível abrir o PDF", erro?.message ?? "Tente novamente.");
    } finally {
      retomarBloqueio();
    }
  }

  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Importar dados de produção" disabled={importando} onPress={() => void escolherPdf()} style={[styles.button, importando && styles.disabled]}>
      <Ionicons name="document-attach-outline" size={18} color={Colors.surface} />
      <Text style={styles.text}>{importando ? "Lendo conta..." : "Importar dados de produção"}</Text>
    </TouchableOpacity>
    <PdfPasswordRetryModal visible={pedindoSenha} busy={importando} onCancel={() => { setPedindoSenha(false); setPdfPendente(null); }} onConfirm={(senha) => { if (pdfPendente) void enviar(pdfPendente, senha); }} />
  </>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingHorizontal: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md },
  text: { color: Colors.surface, fontSize: Typography.caption, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
