import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, EmptyState, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { fecharUsina } from "../../services/fechamentos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function NovoFechamento() {
  const { usinaSelecionada } = useAuth();
  const usinaId = usinaSelecionada?.id;
  const [competencia, setCompetencia] = useState("");
  const [energiaGerada, setEnergiaGerada] = useState("");
  const [energiaAlocada, setEnergiaAlocada] = useState("");
  const [receitaPrevista, setReceitaPrevista] = useState("");
  const [receitaRealizada, setReceitaRealizada] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const correspondencia = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(competencia.trim());
    if (!usinaId) return Alert.alert("Usina não selecionada", "Volte à lista de usinas e abra a usina deste fechamento.");
    if (!correspondencia) return Alert.alert("Competência inválida", "Informe no formato MM/AAAA, por exemplo 07/2026.");
    if (!energiaGerada.trim()) return Alert.alert("Energia obrigatória", "Informe a energia gerada.");

    try {
      setSalvando(true);
      const [, mes, ano] = correspondencia;
      await fecharUsina({
        usinaId, competencia: `${ano}-${mes}-01`,
        energiaGerada: Number(energiaGerada.replace(",", ".")) || 0,
        energiaAlocada: Number(energiaAlocada.replace(",", ".")) || 0,
        receitaPrevista: Number(receitaPrevista.replace(",", ".")) || 0,
        receitaRealizada: Number(receitaRealizada.replace(",", ".")) || 0,
      });
      router.back();
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally { setSalvando(false); }
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Novo fechamento" subtitle="Operação da usina" contextTitle="Novo fechamento" contextSubtitle="Registre a competência da usina" icon="analytics-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>AJUSTE EXCEPCIONAL</Text><Text style={styles.title}>Registrar fechamento manual</Text><Text style={styles.subtitle}>Use somente quando a produção não puder ser importada automaticamente. Os valores ficam registrados no histórico da competência.</Text>
    {!usinaId ? <EmptyState icon="sunny-outline" title="Nenhuma usina selecionada" subtitle="Abra uma usina na lista para registrar o fechamento." /> : <>
      <Text style={styles.label}>Usina deste fechamento: {usinaSelecionada?.nome ?? "Usina selecionada"}</Text>
      <Card>
        <FormField label="Competência" placeholder="MM/AAAA" value={competencia} onChangeText={setCompetencia} keyboardType="numeric" />
        <FormField label="Energia gerada (kWh)" value={energiaGerada} onChangeText={setEnergiaGerada} keyboardType="decimal-pad" />
        <FormField label="Energia alocada (kWh)" value={energiaAlocada} onChangeText={setEnergiaAlocada} keyboardType="decimal-pad" />
        <FormField label="Receita prevista (R$)" value={receitaPrevista} onChangeText={setReceitaPrevista} keyboardType="decimal-pad" />
        <FormField label="Receita realizada (R$)" value={receitaRealizada} onChangeText={setReceitaRealizada} keyboardType="decimal-pad" />
        <Button disabled={salvando} icon={<Ionicons name="checkmark" size={20} color={Colors.surface} />} title={salvando ? "Salvando..." : "Concluir fechamento"} onPress={salvar} />
      </Card>
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 }, label: { marginBottom: Spacing.sm, color: Colors.text, fontSize: Typography.caption, fontWeight: "800" }, options: { gap: Spacing.xs, marginBottom: Spacing.lg }, option: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, radio: { width: 20, height: 20, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.round }, radioSelected: { borderColor: Colors.primary }, radioDot: { width: 10, height: 10, borderRadius: Radius.round, backgroundColor: Colors.primary }, optionText: { flex: 1, color: Colors.text, fontWeight: "600" }, optionTextSelected: { color: Colors.primaryDark, fontWeight: "800" },
});
