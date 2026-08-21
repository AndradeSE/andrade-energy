import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarContratoDaUnidade, salvarContratoDaUnidade } from "../../services/contratos.service";
import { Colors, Spacing, Typography } from "../../theme";

type StatusContrato = "ATIVO" | "VIGENTE" | "VENCIDO";

function dataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

function dataParaFormulario(valor?: string | null) {
  if (!valor) return "";
  const encontrada = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  return encontrada ? `${encontrada[3]}/${encontrada[2]}/${encontrada[1]}` : valor;
}

function valorParaCampo(valor: unknown) {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "";
}

function lerNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
}

export default function ContratoDaUnidade() {
  const { id, numero, clienteId, cliente, descontoPadrao } = useLocalSearchParams<{
    id: string;
    numero: string;
    clienteId: string;
    cliente?: string;
    descontoPadrao?: string;
  }>();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [numeroContrato, setNumeroContrato] = useState(`AE-${numero ?? "UC"}-${new Date().getFullYear()}`);
  const [termoAdesao, setTermoAdesao] = useState("");
  const [status, setStatus] = useState<StatusContrato>("ATIVO");
  const [desconto, setDesconto] = useState(String(descontoPadrao ?? "0"));
  const [inicio, setInicio] = useState(dataHoje());
  const [fim, setFim] = useState("");
  const [economiaMensal, setEconomiaMensal] = useState("");
  const [economiaAnual, setEconomiaAnual] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!clienteId) {
      setCarregando(false);
      return;
    }

    buscarContratoDaUnidade(id)
      .then((contrato) => {
        if (!contrato) return;
        setNumeroContrato(contrato.numero ?? "");
        setTermoAdesao(contrato.termo_adesao ?? "");
        setStatus((["ATIVO", "VIGENTE", "VENCIDO"].includes(String(contrato.status).toUpperCase()) ? String(contrato.status).toUpperCase() : "ATIVO") as StatusContrato);
        setDesconto(valorParaCampo(contrato.desconto));
        setInicio(dataParaFormulario(contrato.vigencia_inicio ?? contrato.data_assinatura) || dataHoje());
        setFim(dataParaFormulario(contrato.vigencia_fim));
        setEconomiaMensal(valorParaCampo(contrato.economia_mensal_estimada));
        setEconomiaAnual(valorParaCampo(contrato.economia_anual_estimada));
        setObservacoes(contrato.observacoes ?? "");
      })
      .catch((erro: any) => {
        Alert.alert("Não foi possível carregar o contrato", erro?.response?.data?.message ?? "Tente novamente.");
      })
      .finally(() => setCarregando(false));
  }, [clienteId, id]);

  function atualizarEconomiaMensal(valor: string) {
    const limpa = valor.replace(/[^\d,.]/g, "");
    setEconomiaMensal(limpa);
    const mensal = lerNumero(limpa);
    if (mensal > 0) setEconomiaAnual((mensal * 12).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
  }

  async function salvar() {
    if (!id || !clienteId) {
      Alert.alert("Unidade não encontrada", "Volte à lista e abra a UC novamente.");
      return;
    }
    if (!numeroContrato.trim()) {
      Alert.alert("Informe o contrato", "O número do contrato é obrigatório.");
      return;
    }

    try {
      setSalvando(true);
      await salvarContratoDaUnidade(id, {
        numero: numeroContrato,
        termo_adesao: termoAdesao,
        status,
        desconto,
        data_assinatura: inicio,
        vigencia_inicio: inicio,
        vigencia_fim: fim,
        economia_mensal_estimada: economiaMensal,
        economia_anual_estimada: economiaAnual,
        observacoes,
      });
      Alert.alert("Contrato salvo", "As informações já estarão disponíveis na aba Contrato do aplicativo do cliente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Loading />;

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader title="Unidades consumidoras" subtitle="Gestão da carteira" contextTitle={`Contrato da UC ${numero}`} contextSubtitle={cliente || "Dados contratuais"} icon="document-text-outline" /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>CONTRATO DO CLIENTE</Text>
          <Text style={styles.title}>Contrato da UC {numero}</Text>
          <Text style={styles.subtitle}>Preencha os dados que o cliente verá na aba Contrato.</Text>
        </View>

        <Card style={styles.context}>
          <Ionicons name="flash-outline" size={21} color={Colors.primary} />
          <View style={styles.contextText}>
            <Text style={styles.contextLabel}>UNIDADE CONSUMIDORA</Text>
            <Text style={styles.contextValue}>UC {numero} · {cliente || "Cliente"}</Text>
          </View>
        </Card>

        <Card>
          <FormField label="Número do contrato *" value={numeroContrato} onChangeText={setNumeroContrato} placeholder="Ex.: AE-2026-001" />
          <FormField label="Termo de adesão" value={termoAdesao} onChangeText={setTermoAdesao} placeholder="Ex.: Termo assinado digitalmente" />
          <ChoiceField label="Status" value={status} onChange={setStatus} options={[{ label: "Ativo", value: "ATIVO" }, { label: "Vigente", value: "VIGENTE" }, { label: "Vencido", value: "VENCIDO" }]} />
          <FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
          <FormField label="Início da vigência" value={inicio} onChangeText={setInicio} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <FormField label="Vencimento do contrato" value={fim} onChangeText={setFim} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <FormField label="Economia mensal estimada (R$)" value={economiaMensal} onChangeText={atualizarEconomiaMensal} keyboardType="decimal-pad" placeholder="0,00" />
          <FormField label="Economia anual estimada (R$)" value={economiaAnual} onChangeText={(valor) => setEconomiaAnual(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" placeholder="0,00" />
          <FormField label="Observações" value={observacoes} onChangeText={setObservacoes} placeholder="Informações adicionais para o contrato" multiline numberOfLines={3} textAlignVertical="top" />
          <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar contrato"} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />} onPress={salvar} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heading: { marginBottom: Spacing.lg },
  eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" },
  subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 20 },
  context: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  contextText: { flex: 1, marginLeft: Spacing.sm },
  contextLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  contextValue: { marginTop: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "700" },
});
