import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Badge, Button, Card, Divider, ElasticScrollView as ScrollView, EmptyState, Loading, Screen, Section } from "../../components/ui";
import { cadastrarInversorNaUsina, excluirInversorDaUsina, listarInversoresDaUsina } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Inversor = {
  id: string;
  numero_serie: string;
  provedor: string;
  modelo?: string | null;
  potencia_nominal_kw?: number | null;
  firmware?: string | null;
  status: "AGUARDANDO_AUTORIZACAO" | "ATIVA" | "ERRO" | "DESATIVADA";
  ultima_sincronizacao_em?: string | null;
};

const rotuloStatus = (status: Inversor["status"]) => ({
  AGUARDANDO_AUTORIZACAO: "Aguardando PHB",
  ATIVA: "Sincronizando",
  ERRO: "Atenção",
  DESATIVADA: "Desativada",
}[status]);

const provedores = [
  { label: "PHB · SolarPortal+", value: "PHB_SOLARPORTAL_PLUS" },
  { label: "Huawei · FusionSolar", value: "HUAWEI_FUSIONSOLAR" },
  { label: "Fronius · Solar.web", value: "FRONIUS_SOLARWEB" },
  { label: "Intelbras", value: "INTELBRAS" },
  { label: "Growatt", value: "GROWATT" },
];
const nomeProvedor = (valor: string) => provedores.find((item) => item.value === valor)?.label ?? valor;

export default function InversoresDaUsina() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [lista, setLista] = useState<Inversor[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [numeroSerie, setNumeroSerie] = useState("");
  const [provedor, setProvedor] = useState("PHB_SOLARPORTAL_PLUS");
  const [modelo, setModelo] = useState("");
  const [potencia, setPotencia] = useState("");
  const [firmware, setFirmware] = useState("");

  const carregar = useCallback(async () => {
    try {
      setLista(await listarInversoresDaUsina(id));
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function cadastrar() {
    if (!numeroSerie.trim()) return Alert.alert("Número de série obrigatório", "Informe o NS exibido nos detalhes do inversor.");
    setSalvando(true);
    try {
      await cadastrarInversorNaUsina(id, {
        numero_serie: numeroSerie, provedor,
        modelo,
        potencia_nominal_kw: Number(potencia.replace(",", ".")) || null,
        firmware,
      });
      setNumeroSerie(""); setModelo(""); setPotencia(""); setFirmware("");
      await carregar();
      Alert.alert("Inversor vinculado", "O equipamento ficou associado a esta usina e aguarda a autorização oficial da PHB.");
    } catch (erro: any) {
      Alert.alert("Não foi possível vincular", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao(item: Inversor) {
    Alert.alert("Remover inversor", `Remover ${item.modelo || item.numero_serie} desta usina?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        try { await excluirInversorDaUsina(id, item.id); await carregar(); }
        catch (erro: any) { Alert.alert("Não foi possível remover", erro?.response?.data?.message ?? erro?.message); }
      } },
    ]);
  }

  if (loading) return <Loading />;
  return <Screen>
    <AppHeader variant="subpage" title="Inversores" subtitle="Monitoramento da geração" contextTitle={nome || "Usina selecionada"} contextSubtitle={`${lista.length} equipamento${lista.length === 1 ? "" : "s"} vinculado${lista.length === 1 ? "" : "s"}`} icon="hardware-chip-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="Equipamentos desta usina" subtitle="Cada número de série pertence a somente uma usina.">
        {lista.length ? lista.map((item) => <Card key={item.id} style={styles.deviceCard}>
          <View style={styles.deviceHeader}><View style={styles.deviceIcon}><Ionicons name="hardware-chip-outline" size={22} color={Colors.primary} /></View><View style={styles.deviceTitle}><Text style={styles.model}>{item.modelo || "Inversor PHB"}</Text><Text style={styles.serial}>NS {item.numero_serie}</Text></View><Badge label={rotuloStatus(item.status)} variant={item.status === "ATIVA" ? "success" : "warning"} /></View>
          <Divider />
          <Text style={styles.detail}>{nomeProvedor(item.provedor)} · {item.potencia_nominal_kw ? `${Number(item.potencia_nominal_kw).toLocaleString("pt-BR")} kW` : "Potência não informada"}{item.firmware ? ` · Firmware ${item.firmware}` : ""}</Text>
          <Text style={styles.sync}>{item.ultima_sincronizacao_em ? `Última sincronização: ${new Date(item.ultima_sincronizacao_em).toLocaleString("pt-BR")}` : "A sincronização começará após a PHB liberar a API oficial."}</Text>
          <Button title="Remover vínculo" onPress={() => confirmarExclusao(item)} style={styles.removeButton} />
        </Card>) : <EmptyState icon="hardware-chip-outline" title="Nenhum inversor vinculado" subtitle="Cadastre abaixo o equipamento instalado nesta usina." />}
      </Section>

      <Section title="Vincular inversor" subtitle="Escolha a plataforma e use os dados exibidos nos detalhes do equipamento.">
        <Card>
          <ChoiceField label="Fabricante / plataforma" value={provedor} onChange={setProvedor} options={provedores} />
          <FormField label="Número de série (NS)" value={numeroSerie} onChangeText={(v) => setNumeroSerie(v.trim().toUpperCase())} autoCapitalize="characters" />
          <FormField label="Modelo" value={modelo} onChangeText={setModelo} placeholder="Ex.: PHB75K-GT" autoCapitalize="characters" />
          <FormField label="Potência nominal (kW)" value={potencia} onChangeText={setPotencia} keyboardType="decimal-pad" placeholder="Ex.: 75" />
          <FormField label="Firmware" value={firmware} onChangeText={setFirmware} placeholder="Ex.: V1.06.06" autoCapitalize="characters" />
          <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} /><Text style={styles.noticeText}>Não informe a senha do aplicativo do fabricante. A credencial oficial de integração será configurada somente no servidor quando o provedor autorizar o acesso.</Text></View>
          <Button disabled={salvando} title={salvando ? "Vinculando..." : "Vincular a esta usina"} onPress={cadastrar} />
        </Card>
      </Section>
      <Button title="Voltar para a usina" onPress={() => router.back()} style={styles.backButton} />
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  deviceCard: { marginBottom: Spacing.md }, deviceHeader: { flexDirection: "row", alignItems: "center" },
  deviceIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: "center", justifyContent: "center" },
  deviceTitle: { flex: 1, marginHorizontal: Spacing.sm }, model: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  serial: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.caption }, detail: { color: Colors.text, fontWeight: "700" },
  sync: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  removeButton: { height: 44, marginTop: Spacing.md, backgroundColor: Colors.danger },
  notice: { flexDirection: "row", gap: Spacing.sm, padding: Spacing.md, marginBottom: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primarySoft },
  noticeText: { flex: 1, color: Colors.text, fontSize: Typography.caption, lineHeight: 19 }, backButton: { marginTop: Spacing.sm },
});
