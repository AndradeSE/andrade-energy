import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Switch } from "../assistant/AssistantNativeControls";
import { Button, Card } from "../ui";
import { useAuth } from "../../contexts/AuthContext";
import { buscarUnidade, configurarAutoleitura } from "../../services/clientes.service";
import { Colors, Spacing } from "../../theme";

export default function UnitReadingSwitch({ id }: { id: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["reading-unit-control", user?.id, user?.empresa_id, id];
  const unit = useQuery({ queryKey: key, enabled: Boolean(id && user?.id), queryFn: () => buscarUnidade(id) });
  const [saving, setSaving] = useState(false);
  useFocusEffect(useCallback(() => { if (id) void unit.refetch(); }, [id]));
  const rural = unit.data?.id === id && unit.data?.zona_localizacao === "RURAL";
  const active = unit.data?.autoleitura_rural_ativa === true;
  async function change(value: boolean) {
    if (saving || !rural) return;
    setSaving(true);
    try {
      await configurarAutoleitura(id, "RURAL", value);
      client.setQueryData(key, { ...unit.data, autoleitura_rural_ativa: value });
      void client.invalidateQueries({ queryKey: ["reading-automation-units"] });
    } catch {
      Alert.alert("Não foi possível salvar", "O estado anterior foi mantido. Confira a conexão e tente novamente.");
    } finally { setSaving(false); }
  }
  return <Card>
    <Text style={styles.title}>Envio automático desta UC</Text>
    {unit.isPending ? <Text style={styles.caption}>Consultando configuração…</Text> : unit.isError ? <><Text style={styles.caption}>Não foi possível confirmar o estado desta UC.</Text><Button title="Tentar novamente" onPress={() => void unit.refetch()} /></> : !rural ? <Text style={styles.caption}>A autoleitura está disponível somente para UCs rurais.</Text> : <>
      <View style={styles.row}><Text accessibilityLiveRegion="polite" style={styles.state}>{saving ? "Salvando…" : active ? "Ativado" : "Desativado"}</Text><Switch accessibilityLabel="Autoleitura e envio automático desta UC" value={active} disabled={saving || unit.isFetching} onValueChange={value => { void change(value); }} trackColor={{ false: "#89968F", true: Colors.primary }} thumbColor="#FFFFFF" /></View>
      <Text style={styles.caption}>Desative para retirar somente esta UC da autoleitura, sem alterar as demais. Ativar permite receber a leitura; o envio automático também depende do controle geral em Rateio, do prazo e da situação da unidade.</Text>
    </>}
  </Card>;
}
const styles = StyleSheet.create({ title: { color: Colors.primaryDark, fontWeight: "700", fontSize: 18 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: Spacing.sm }, state: { fontSize: 16, color: Colors.primaryDark, fontWeight: "700" }, caption: { color: Colors.subtitle, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm } });
