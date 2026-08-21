import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Card, Divider, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { analisarFatura, processarFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FaturamentoManual() {
  const [arquivo, setArquivo] = useState<{ uri: string; name: string }>();
  const [analise, setAnalise] = useState<any>();
  const [lendo, setLendo] = useState(false);
  const [faturando, setFaturando] = useState(false);

  async function selecionar() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
    if (resultado.canceled) return;
    const item = resultado.assets[0];
    try {
      setLendo(true);
      const dados = await analisarFatura(item.uri, item.name);
      setArquivo({ uri: item.uri, name: item.name });
      setAnalise(dados);
    } catch (erro: any) {
      Alert.alert("Não foi possível ler a fatura", erro?.response?.data?.message ?? erro?.message ?? "Confira o PDF.");
    } finally { setLendo(false); }
  }

  async function faturar() {
    if (!arquivo) return;
    try {
      setFaturando(true);
      const resultado = await processarFatura(arquivo.uri, arquivo.name);
      if (resultado?.resultado?.clienteNaoEncontrado) {
        const uc = String(resultado?.resultado?.dadosCadastro?.uc ?? analise?.dados?.uc ?? "");
        Alert.alert(
          "UC ainda não cadastrada",
          `A unidade ${uc || "identificada na conta"} precisa ser vinculada a um cliente antes do faturamento.`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Cadastrar UC",
              onPress: () => router.push({
                pathname: "/unidades/nova",
                params: { origem: "fatura", uc, cadastroRapido: "1" },
              }),
            },
          ]
        );
        return;
      }
      if (resultado?.resultado?.jaProcessada) {
        Alert.alert("Fatura já processada", "Esta competência já foi faturada para a unidade.");
        return;
      }
      Alert.alert("Faturamento concluído", "A cobrança foi gerada e o envio foi colocado na fila para o e-mail cadastrado.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) {
      Alert.alert("Não foi possível faturar", erro?.response?.data?.message ?? erro?.message ?? "Confira os dados e tente novamente.");
    } finally { setFaturando(false); }
  }

  const dados = analise?.dados;
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Nova fatura" subtitle="Importar conta de energia" contextTitle="Faturar via conta de energia" contextSubtitle="Importe a conta da concessionária" icon="receipt-outline" /> : null}<ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={Colors.text} /></TouchableOpacity>
    <Text style={styles.eyebrow}>FINANCEIRO</Text><Text style={styles.title}>Faturar via conta de energia</Text><Text style={styles.subtitle}>Selecione a conta da concessionária em PDF, confira os dados e confirme a geração da cobrança.</Text>

    <TouchableOpacity disabled={lendo || faturando} activeOpacity={0.84} onPress={selecionar} style={styles.upload}>
      <View style={styles.uploadIcon}><Ionicons name="document-attach-outline" size={26} color={Colors.primary} /></View>
      <View style={styles.uploadInfo}><Text style={styles.uploadTitle}>{lendo ? "Lendo fatura..." : arquivo?.name ?? "Selecionar fatura em PDF"}</Text><Text style={styles.uploadHint}>{arquivo ? "Toque para escolher outro arquivo" : "PDF da concessionária"}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
    </TouchableOpacity>

    {dados ? <Card><Info label="Cliente" value={dados.cliente || "Não identificado"} /><Divider /><Info label="Unidade consumidora" value={dados.uc || "Não identificada"} /><Divider /><Info label="Concessionária" value={dados.distribuidora || "Não identificada"} /><Divider /><Info label="Competência" value={dados.referencia || "Não identificada"} /><Divider /><Info label="Vencimento" value={dados.vencimento || "Não identificado"} /><Divider /><Info label="Consumo" value={`${Number(dados.consumo ?? 0).toLocaleString("pt-BR")} kWh`} /><Divider /><Info label="Valor da concessionária" value={moeda(dados.valorTotal)} /></Card> : null}

    {dados ? <><View style={styles.notice}><Ionicons name="mail-outline" size={20} color={Colors.primary} /><Text style={styles.noticeText}>Após confirmar, os documentos serão enviados para o e-mail cadastrado no cliente vinculado a esta UC.</Text></View><Button disabled={faturando} title={faturando ? "Faturando..." : "Confirmar faturamento"} onPress={faturar} /></> : null}
  </ScrollView></Screen>;
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.surface }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 }, upload: { minHeight: 76, flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, backgroundColor: Colors.surface }, uploadIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, uploadInfo: { flex: 1, marginHorizontal: Spacing.sm }, uploadTitle: { color: Colors.text, fontWeight: "800" }, uploadHint: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, info: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md }, infoLabel: { flex: 1, color: Colors.subtitle, fontSize: Typography.small }, infoValue: { flex: 1, color: Colors.text, fontWeight: "800", textAlign: "right" }, notice: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight }, noticeText: { flex: 1, color: Colors.primaryDark, fontSize: Typography.small, lineHeight: 19 },
});
