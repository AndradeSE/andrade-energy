import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { Button, Card, Loading, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";

export default function EditarAlocacaoUnidade() {
  const { numero, clienteId } = useLocalSearchParams<{ id: string; numero: string; clienteId: string }>();
  const [usinas, setUsinas] = useState<any[]>([]); const [usinaId, setUsinaId] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO"); const [percentual, setPercentual] = useState("");
  const [desconto, setDesconto] = useState("40"); const [consumoMedio, setConsumoMedio] = useState("0");
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);

  useEffect(() => { Promise.all([
    supabase.from("usinas").select("id,nome").order("nome"),
    supabase.from("clientes").select("usina_id,modalidade_faturamento,percentual_rateio,desconto_percentual,consumo_medio_kwh,nome,endereco,distribuidora").eq("id", clienteId).single(),
  ]).then(([lista, cliente]) => { setUsinas(lista.data ?? []); const c = cliente.data; if (c) { setUsinaId(c.usina_id ?? ""); setModalidade(c.modalidade_faturamento ?? "COMPENSACAO"); setPercentual(String(c.percentual_rateio ?? (c.modalidade_faturamento === "INJECAO" ? 100 : ""))); setDesconto(String(c.desconto_percentual ?? 40)); setConsumoMedio(String(c.consumo_medio_kwh ?? 0)); } setLoading(false); }); }, [clienteId]);

  async function salvar() {
    const rateio = Number(percentual.replace(",", ".")); const descontoNumero = Number(desconto.replace(",", ".")); const media = Math.max(0, Number(consumoMedio.replace(",", ".")) || 0);
    if (!usinaId) return Alert.alert("Escolha a usina", "Selecione a usina que fornecerá energia para esta UC.");
    if (!Number.isFinite(rateio) || rateio <= 0 || rateio > 100) return Alert.alert("Percentual inválido", "Informe um percentual entre 0,01% e 100%.");
    if (!Number.isFinite(descontoNumero) || descontoNumero < 0 || descontoNumero > 100) return Alert.alert("Desconto inválido", "Informe um desconto entre 0% e 100%.");
    try { setSalvando(true);
      const { data: cliente, error: erroBusca } = await supabase.from("clientes").select("nome,endereco,distribuidora").eq("id", clienteId).single(); if (erroBusca) throw erroBusca;
      const { error: erroCliente } = await supabase.from("clientes").update({ usina_id: usinaId, modalidade_faturamento: modalidade, percentual_rateio: rateio, desconto_percentual: descontoNumero, consumo_medio_kwh: media }).eq("id", clienteId); if (erroCliente) throw erroCliente;
      const payload = { cliente_id: clienteId, usina_id: usinaId, numero: String(numero).replace(/\D/g, ""), tipo: "BENEFICIARIA", titular: cliente.nome, endereco: cliente.endereco, distribuidora: cliente.distribuidora ?? "CEMIG", modalidade_faturamento: modalidade, desconto_percentual: descontoNumero, status: "ATIVA" };
      const { error: erroUc } = await supabase.from("unidades_consumidoras").upsert(payload, { onConflict: "numero" }); if (erroUc) throw erroUc;
      Alert.alert("Alocação salva", "A UC foi vinculada à usina com sucesso.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) { Alert.alert("Não foi possível alocar", erro?.message ?? "Tente novamente."); } finally { setSalvando(false); }
  }

  if (loading) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>UNIDADE CONSUMIDORA</Text><Text style={styles.title}>Editar e alocar UC {numero}</Text><Text style={styles.subtitle}>Defina a origem e as regras de energia desta unidade.</Text><Card>
    <Text style={styles.label}>Usina vinculada</Text><View style={styles.options}>{usinas.map((usina) => <Pressable key={usina.id} onPress={() => { setUsinaId(usina.id); if (modalidade === "INJECAO" && !percentual) setPercentual("100"); }} style={[styles.option, usinaId === usina.id && styles.selected]}><Text>{usina.nome}</Text></Pressable>)}</View>
    <ChoiceField label="Modalidade" value={modalidade} onChange={(valor) => { setModalidade(valor); if (valor === "INJECAO" && !percentual) setPercentual("100"); }} options={[{ label: "Por injeção", value: "INJECAO" }, { label: "Por compensação", value: "COMPENSACAO" }]} />
    <FormField label="Percentual alocado (%)" value={percentual} onChangeText={(valor) => setPercentual(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" /><FormField label="Média de consumo em 12 meses (kWh)" value={consumoMedio} onChangeText={(valor) => setConsumoMedio(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" /><FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" />
    <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar alocação da UC"} onPress={salvar} />
  </Card></ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle }, label: { marginBottom: Spacing.xs, color: Colors.text, fontWeight: "700" }, options: { gap: Spacing.xs, marginBottom: Spacing.lg }, option: { padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface }, selected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight } });
