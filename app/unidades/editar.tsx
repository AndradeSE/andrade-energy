import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { supabase } from "../../supabase";
import { alocarUnidade, listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";

export default function EditarAlocacaoUnidade() {
  const { numero, clienteId } = useLocalSearchParams<{ id: string; numero: string; clienteId: string }>();
  const [usinas, setUsinas] = useState<any[]>([]); const [usinaId, setUsinaId] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO"); const [percentual, setPercentual] = useState("");
  const [desconto, setDesconto] = useState("40"); const [consumoMedio, setConsumoMedio] = useState("0");
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);

  function percentualPelaMedia(usina: any, consumo: string) {
    const producao = Number(usina?.producao_media_12_meses ?? 0);
    const media = Number(consumo.replace(",", ".")) || 0;
    return producao > 0 && media > 0 ? String(Math.min(100, media / producao * 100).toFixed(2)).replace(".", ",") : "";
  }

  useEffect(() => { Promise.all([
    listarUsinas(),
    supabase.from("clientes").select("usina_id,modalidade_faturamento,percentual_rateio,desconto_percentual,consumo_medio_kwh,nome,endereco,distribuidora").eq("id", clienteId).single(),
  ]).then(([lista, cliente]) => { const c = cliente.data; const porChave = new Map<string, any>(); for (const usina of lista ?? []) { const chave = String(usina.numero_instalacao ?? usina.nome).replace(/\W/g, "").toLowerCase(); if (!porChave.has(chave) || usina.id === c?.usina_id) porChave.set(chave, usina); } setUsinas([...porChave.values()]); if (c) { setUsinaId(c.usina_id ?? ""); setModalidade(c.modalidade_faturamento ?? "COMPENSACAO"); setPercentual(String(c.percentual_rateio ?? "")); setDesconto(String(c.desconto_percentual ?? 40)); setConsumoMedio(String(c.consumo_medio_kwh ?? 0)); } setLoading(false); }).catch((erro) => { Alert.alert("Não foi possível carregar as usinas", erro?.message ?? "Tente novamente."); setLoading(false); }); }, [clienteId]);

  async function salvar() {
    const rateio = Number(percentual.replace(",", ".")); const descontoNumero = Number(desconto.replace(",", ".")); const media = Math.max(0, Number(consumoMedio.replace(",", ".")) || 0);
    if (!usinaId) return Alert.alert("Escolha a usina", "Selecione a usina que fornecerá energia para esta UC.");
    if (!Number.isFinite(rateio) || rateio <= 0 || rateio > 100) return Alert.alert("Percentual inválido", "Informe um percentual entre 0,01% e 100%.");
    if (!Number.isFinite(descontoNumero) || descontoNumero < 0 || descontoNumero > 100) return Alert.alert("Desconto inválido", "Informe um desconto entre 0% e 100%.");
    try { setSalvando(true);
      await alocarUnidade(usinaId, { clienteId, numero, modalidade, percentual: rateio, desconto: descontoNumero, consumoMedio: media, calcularAutomaticamente: false });
      Alert.alert("Alocação salva", "A UC foi vinculada à usina com sucesso.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) { Alert.alert("Não foi possível alocar", erro?.message ?? "Tente novamente."); } finally { setSalvando(false); }
  }

  if (loading) return <Loading />;
  return <Screen>{IS_GERADOR_APP ? <AppHeader title="Unidades consumidoras" subtitle="Gestão da carteira" contextTitle={`UC ${numero}`} contextSubtitle="Alocação e faturamento" icon="flash-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>UNIDADE CONSUMIDORA</Text><Text style={styles.title}>Editar e alocar UC {numero}</Text><Text style={styles.subtitle}>Defina a origem e as regras de energia desta unidade.</Text><Card>
    <Text style={styles.label}>Usinas disponíveis</Text><View style={styles.options}>{usinas.map((usina) => <Pressable key={usina.id} onPress={() => { setUsinaId(usina.id); setPercentual(percentualPelaMedia(usina, consumoMedio)); }} style={[styles.option, usinaId === usina.id && styles.selected]}><View><Text style={styles.optionName}>{usina.nome}</Text><Text style={styles.optionDetail}>Produção média em 12 meses: {Number(usina.producao_media_12_meses ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh</Text></View>{usinaId === usina.id ? <Text style={styles.selectedText}>SELECIONADA</Text> : null}</Pressable>)}</View>
    <ChoiceField label="Modalidade" value={modalidade} onChange={setModalidade} options={[{ label: "Por injeção", value: "INJECAO" }, { label: "Por compensação", value: "COMPENSACAO" }]} />
    <FormField label="Média de consumo em 12 meses (kWh)" value={consumoMedio} onChangeText={(valor) => { const limpa = valor.replace(/[^\d,.]/g, ""); setConsumoMedio(limpa); const escolhida = usinas.find((usina) => usina.id === usinaId); if (escolhida) setPercentual(percentualPelaMedia(escolhida, limpa)); }} keyboardType="decimal-pad" /><FormField label="Percentual alocado (%)" value={percentual} onChangeText={(valor) => setPercentual(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" /><Text style={styles.hint}>Calculado pelo consumo médio do cliente dividido pela produção média da usina nos últimos 12 meses. Pode ser editado.</Text><FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" />
    <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar alocação da UC"} onPress={salvar} />
  </Card></ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle }, label: { marginBottom: Spacing.xs, color: Colors.text, fontWeight: "700" }, options: { gap: Spacing.xs, marginBottom: Spacing.lg }, option: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface }, selected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, optionName: { color: Colors.text, fontWeight: "800" }, optionDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small }, selectedText: { color: Colors.primary, fontSize: 10, fontWeight: "900" }, hint: { marginTop: -Spacing.sm, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 } });
