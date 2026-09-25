import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { listarUnidadesGestor } from "../../services/clientes.service";
import { processarFatura } from "../../services/faturas.service";
import { useAuth } from "../../contexts/AuthContext";
import { initialTabKey } from "../../services/navigation-preload.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Faturamento() {
  const { user, usinaSelecionada, suspenderBloqueioTemporariamente } = useAuth();
  const queryClient = useQueryClient();
  const unidadesIniciais = queryClient.getQueryData<any[]>(initialTabKey(String(user?.id ?? ""), usinaSelecionada?.id ?? user?.usina_id, "faturamento"));
  const [carregando, setCarregando] = useState(!unidadesIniciais);
  const [atualizando, setAtualizando] = useState(false);
  const [unidadesRecebimento, setUnidadesRecebimento] = useState<any[]>(() => (unidadesIniciais ?? []).filter((item: any) => {
    const usina = Array.isArray(item.usinas) ? item.usinas[0] : item.usinas;
    return String(item.tipo ?? "BENEFICIARIA").toUpperCase() !== "GERADORA" && String(usina?.titularidade_ucs_recebedoras ?? "GERADOR") === "GERADOR";
  }));
  const [faturandoPdf, setFaturandoPdf] = useState(false);
  const [pdfPendente, setPdfPendente] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [senhaPdf, setSenhaPdf] = useState("");
  const [solicitarSenhaPdf, setSolicitarSenhaPdf] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const unidades = await listarUnidadesGestor();
      setUnidadesRecebimento((unidades ?? []).filter((item: any) => {
        const usina = Array.isArray(item.usinas) ? item.usinas[0] : item.usinas;
        return String(item.tipo ?? "BENEFICIARIA").toUpperCase() !== "GERADORA"
          && String(usina?.titularidade_ucs_recebedoras ?? "GERADOR") === "GERADOR";
      }));
    } catch (erro: any) {
      Alert.alert("Faturamento indisponível", erro?.response?.data?.message ?? "Não foi possível carregar as unidades.");
    } finally {
      setCarregando(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }

  async function faturarViaPdf() {
    if (faturandoPdf) return;
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      let pdf = pdfPendente;
      if (!pdf) {
        const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
        if (arquivo.canceled) return;
        pdf = arquivo.assets[0];
        setPdfPendente(pdf);
      }
      setFaturandoPdf(true);
      const resultado = await processarFatura(pdf.uri, pdf.name, senhaPdf);
      if (resultado?.resultado?.clienteNaoEncontrado) {
        setPdfPendente(null); setSenhaPdf(""); setSolicitarSenhaPdf(false);
        const uc = String(resultado?.resultado?.dadosCadastro?.uc ?? "");
        Alert.alert("UC ainda não cadastrada", `A unidade ${uc || "identificada na conta"} precisa ser vinculada antes do faturamento.`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Cadastrar UC", onPress: () => router.push({ pathname: "/unidades/nova", params: { origem: "fatura", uc, cadastroRapido: "1" } }) },
        ]);
        return;
      }
      if (resultado?.resultado?.jaProcessada) {
        setPdfPendente(null); setSenhaPdf(""); setSolicitarSenhaPdf(false);
        Alert.alert("Fatura já processada", "Esta competência já foi faturada para a unidade.");
        return;
      }
      setPdfPendente(null); setSenhaPdf(""); setSolicitarSenhaPdf(false);
      Alert.alert("Faturamento concluído", "A fatura foi processada e a cobrança foi gerada.", [
        { text: "Ver faturas", onPress: () => router.push("/faturas" as any) },
        { text: "OK" },
      ]);
    } catch (erro: any) {
      if (erro?.response?.data?.code === "PDF_PASSWORD_REQUIRED") {
        setSolicitarSenhaPdf(true);
        Alert.alert("PDF protegido", "Este arquivo exige senha. Informe a senha abaixo para continuar.");
      } else {
        setPdfPendente(null); setSenhaPdf(""); setSolicitarSenhaPdf(false);
        Alert.alert("Não foi possível faturar", erro?.response?.data?.message ?? erro?.message ?? "Confira o PDF e tente novamente.");
      }
    } finally {
      setFaturandoPdf(false);
      retomarBloqueio();
    }
  }

  return <Screen>
    <AppHeader title="Faturamento" subtitle="Emissão e acompanhamento" contextTitle="Faturamento" contextSubtitle="Processar, automatizar e consultar faturas" icon="receipt-outline" />
    {carregando ? <Loading /> : <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}>
      <Card>
        <Text style={styles.title}>Como deseja faturar?</Text>
        <Text style={styles.subtitle}>Escolha uma opção para iniciar ou configurar o faturamento.</Text>
        {solicitarSenhaPdf ? <View style={styles.passwordNotice}>
          <Text style={styles.passwordTitle}>Este PDF exige senha</Text>
          <Text style={styles.subtitle}>Informe a senha do arquivo selecionado para continuar.</Text>
          <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" maxLength={4} onChangeText={setSenhaPdf} placeholder="4 primeiros números do CPF" secureTextEntry style={styles.input} value={senhaPdf} />
          <Text style={styles.hint}>A senha é usada apenas para abrir a fatura.</Text>
        </View> : null}
        <View style={styles.actions}>
          <Action icon="document-attach-outline" title={faturandoPdf ? "Processando PDF..." : solicitarSenhaPdf ? "Continuar com a senha" : "Faturamento via PDF"} description="Importar a conta da concessionária" disabled={faturandoPdf} onPress={() => void faturarViaPdf()} />
          <Action icon="create-outline" title="Faturamento manual" description="Preencher os dados da cobrança" onPress={() => router.push("/faturamento/criar-manual" as any)} />
          <Action icon="mail-unread-outline" title="Fatura automática" description="Configurar o recebimento por e-mail" onPress={() => {
            const unidade = unidadesRecebimento[0];
            if (!unidade?.id) return Alert.alert("Fatura automática", "Cadastre e vincule uma UC recebedora a uma usina antes de configurar o e-mail.");
            router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidade.id, escopo: "usina" } });
          }} />
          <Action icon="receipt-outline" title="Faturas" description="Ver cobranças abertas, vencidas e pagas" onPress={() => router.push("/faturas" as any)} />
        </View>
      </Card>
    </ScrollView>}
  </Screen>;
}

function Action({ icon, title, description, disabled = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; disabled?: boolean; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} activeOpacity={0.82} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
    <View style={styles.icon}><Ionicons name={icon} size={22} color={Colors.primary} /></View>
    <View style={styles.copy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.description}>{description}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  title: { color: Colors.primaryDark, fontSize: Typography.card, fontWeight: "900" },
  subtitle: { marginTop: 4, marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  actions: { gap: Spacing.sm },
  action: { minHeight: 70, flexDirection: "row", alignItems: "center", padding: Spacing.sm, borderWidth: 1, borderColor: "#D6E4DC", borderRadius: Radius.md, backgroundColor: "#F8FBF9" },
  disabled: { opacity: 0.6 },
  icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  copy: { flex: 1, marginHorizontal: Spacing.sm },
  actionTitle: { color: Colors.text, fontSize: Typography.small, fontWeight: "900" },
  description: { marginTop: 3, color: Colors.subtitle, fontSize: 11 },
  passwordNotice: { marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: "#E8C879", borderRadius: Radius.md, backgroundColor: "#FFF9E8" },
  passwordTitle: { color: Colors.text, fontWeight: "900" },
  input: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, color: Colors.text, backgroundColor: Colors.background },
  hint: { marginTop: 5, color: Colors.subtitle, fontSize: 11 },
});
