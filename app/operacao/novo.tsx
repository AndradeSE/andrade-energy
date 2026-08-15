import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { Button, Card, EmptyState, Loading, Screen } from "../../components/ui";
import { fecharUsina } from "../../services/fechamentos.service";
import { listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function NovoFechamento() {
  const [usinas, setUsinas] = useState<any[]>([]);
  const [usinaId, setUsinaId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [energiaGerada, setEnergiaGerada] = useState("");
  const [energiaAlocada, setEnergiaAlocada] = useState("");
  const [receitaPrevista, setReceitaPrevista] = useState("");
  const [receitaRealizada, setReceitaRealizada] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarUsinas().then((lista) => {
      setUsinas(lista ?? []);
      if (lista?.length) setUsinaId(lista[0].id);
    }).catch(() => Alert.alert("Não foi possível carregar", "Confira sua conexão e tente novamente.")).finally(() => setLoading(false));
  }, []);

  async function salvar() {
    const correspondencia = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(competencia.trim());
    if (!usinaId) return Alert.alert("Escolha uma usina", "Selecione a usina deste fechamento.");
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

  if (loading) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>OPERAÇÃO DA USINA</Text><Text style={styles.title}>Novo fechamento</Text><Text style={styles.subtitle}>Registre a geração, a alocação e o resultado financeiro da competência.</Text>
    {!usinas.length ? <EmptyState icon="sunny-outline" title="Nenhuma usina cadastrada" subtitle="Cadastre uma usina antes de criar o fechamento." /> : <>
      <Text style={styles.label}>Usina</Text><View style={styles.options}>{usinas.map((usina) => <Pressable key={usina.id} onPress={() => setUsinaId(usina.id)} style={[styles.option, usinaId === usina.id && styles.optionSelected]}><View style={[styles.radio, usinaId === usina.id && styles.radioSelected]}>{usinaId === usina.id ? <View style={styles.radioDot} /> : null}</View><Text style={[styles.optionText, usinaId === usina.id && styles.optionTextSelected]}>{usina.nome}</Text></Pressable>)}</View>
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
