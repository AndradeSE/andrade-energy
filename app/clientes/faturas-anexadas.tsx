import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppHeader, Card, ElasticScrollView as ScrollView, EmptyState, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { anexarFaturaCliente, FaturaAnexadaCliente, listarFaturasAnexadasCliente } from "../../services/clientes.service";
import { calcularMediaConsumoFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

function dataBrasileira(valor?: string) {
  if (!valor) return "Data não informada";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleDateString("pt-BR");
}

function tipoGd(dados: Record<string, any>) {
  const informado = String(dados.tipoGd ?? dados.tipo_gd ?? "").toUpperCase();
  if (["GD1", "GD2", "MISTA"].includes(informado)) return informado;
  const gd1 = Number(dados.energiaCompensadaGD1 ?? dados.energia_compensada_gd1 ?? 0) > 0;
  const gd2 = Number(dados.energiaCompensadaGD2 ?? dados.energia_compensada_gd2 ?? 0) > 0;
  return gd1 && gd2 ? "MISTA" : gd2 ? "GD2" : gd1 ? "GD1" : "";
}

export default function FaturasAnexadas() {
  const params = useLocalSearchParams<{ clienteId?: string; selecionarUc?: string; cliente?: string }>();
  const { user, suspenderBloqueioTemporariamente } = useAuth();
  const clienteId = String(params.clienteId ?? user?.cliente_id ?? "");
  const selecionarUc = IS_GERADOR_APP && params.selecionarUc === "1";
  const [faturas, setFaturas] = useState<FaturaAnexadaCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const titulo = selecionarUc ? "Escolher fatura para UC" : "Contas vinculadas ao CPF";
  const subtitulo = selecionarUc
    ? "Escolha uma conta já anexada para preencher a unidade consumidora."
    : IS_GERADOR_APP
      ? "Contas da concessionária enviadas pelo consumidor ficam disponíveis para consulta e cadastro de UC."
      : "Anexe somente contas da concessionária de pontos de instalação vinculados ao seu CPF. Não são faturas Andrade Energy.";

  const carregar = useCallback(async () => {
    if (!clienteId) {
      setCarregando(false);
      return;
    }
    try {
      setFaturas(await listarFaturasAnexadasCliente(clienteId));
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? "Tente atualizar novamente.");
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }

  async function selecionarArquivo() {
    if (!clienteId || enviando) return;
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      if (resultado.canceled || !resultado.assets?.[0]) return;
      setEnviando(true);
      await anexarFaturaCliente(clienteId, resultado.assets[0]);
      await carregar();
      Alert.alert("Conta anexada", "A conta da concessionária foi salva no seu perfil e poderá ser usada pelo gerador para cadastrar a UC vinculada ao seu CPF.");
    } catch (erro: any) {
      Alert.alert("Não foi possível anexar", erro?.response?.data?.message ?? "Confira o PDF da CEMIG e tente novamente.");
    } finally {
      setEnviando(false);
      retomarBloqueio();
    }
  }

  function usarNaUc(fatura: FaturaAnexadaCliente) {
    const dados = fatura.dadosFatura ?? {};
    const numero = String(dados.uc ?? dados.numero_instalacao ?? "").replace(/\D/g, "");
    const consumoMedio = calcularMediaConsumoFatura(dados);
    if (!numero) {
      Alert.alert("Dados incompletos", "Esta fatura não possui uma UC identificada.");
      return;
    }
    router.replace({
      pathname: "/unidades/nova",
      params: {
        origem: "fatura",
        clienteId,
        cliente: String(dados.cliente ?? dados.titular ?? params.cliente ?? ""),
        uc: numero,
        cpf: String(dados.cpfParcial ?? dados.cpf_parcial ?? dados.cpf ?? "").replace(/\D/g, "").slice(0, 4),
        endereco: String(dados.endereco ?? ""),
        energiaCompensada: String(dados.energiaCompensada ?? dados.energia_compensada ?? 0),
        consumoMedio: consumoMedio > 0 ? String(consumoMedio) : "",
        tipoGd: tipoGd(dados),
        dadosFatura: JSON.stringify(dados),
      },
    });
  }

  const quantidade = useMemo(() => faturas.length, [faturas.length]);

  return <Screen>
    {IS_GERADOR_APP ? <AppHeader variant="subpage" title={titulo} subtitle={params.cliente ? `Cliente: ${params.cliente}` : "Documentos do cliente"} contextTitle={`${quantidade} fatura${quantidade === 1 ? "" : "s"} anexada${quantidade === 1 ? "" : "s"}`} contextSubtitle={selecionarUc ? "Selecione para cadastrar a UC" : "Contas particulares da concessionária"} icon="document-text-outline" /> : null}
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}>
      {!IS_GERADOR_APP ? <View style={styles.heading}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={Colors.text} /></TouchableOpacity><View style={styles.headingCopy}><Text style={styles.title}>{titulo}</Text><Text style={styles.subtitle}>{subtitulo}</Text></View></View> : <Text style={styles.description}>{subtitulo}</Text>}
      {!selecionarUc ? <TouchableOpacity disabled={!clienteId || enviando} onPress={selecionarArquivo} style={[styles.upload, (!clienteId || enviando) && styles.disabled]}>
        <View style={styles.uploadIcon}>{enviando ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />}</View>
        <View style={styles.uploadCopy}><Text style={styles.uploadTitle}>{enviando ? "Anexando conta..." : "Anexar conta vinculada ao CPF"}</Text><Text style={styles.uploadHint}>PDF da concessionária de uma UC do seu CPF; ficará disponível também para o gerador.</Text></View>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity> : null}
      {carregando ? <View style={styles.loading}><ActivityIndicator color={Colors.primary} /></View> : faturas.length ? faturas.map((fatura) => {
        const dados = fatura.dadosFatura ?? {};
        const uc = String(dados.uc ?? dados.numero_instalacao ?? "").replace(/\D/g, "");
        return <Card key={fatura.id} style={styles.card}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => Linking.openURL(fatura.url)} style={styles.cardMain}>
            <View style={styles.documentIcon}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /></View>
            <View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardTitle}>{fatura.nome || "Conta de energia"}</Text><Text numberOfLines={1} style={styles.cardMeta}>{uc ? `UC ${uc}` : "UC não identificada"} · Anexada em {dataBrasileira(fatura.criadoEm)}</Text><Text numberOfLines={1} style={styles.cardDetail}>{dados.titular ?? dados.cliente ?? "Titular não identificado"}</Text></View>
            <Ionicons name="open-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          {IS_GERADOR_APP ? <TouchableOpacity disabled={!uc} onPress={() => usarNaUc(fatura)} style={[styles.useButton, !uc && styles.disabled]}><Ionicons name="add-circle-outline" size={19} color={Colors.surface} /><Text style={styles.useButtonText}>{uc ? "Adicionar UC por esta fatura" : "UC não identificada nesta fatura"}</Text></TouchableOpacity> : null}
        </Card>;
      }) : <EmptyState icon="document-outline" title="Nenhuma conta anexada" subtitle={selecionarUc ? "O cliente ainda não enviou uma conta de energia." : "Anexe uma conta da concessionária de uma unidade vinculada ao seu CPF."} />}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.lg },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.round, backgroundColor: Colors.surface },
  headingCopy: { flex: 1 },
  title: { color: Colors.text, fontSize: Typography.section, fontWeight: "900" },
  subtitle: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
  description: { marginBottom: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 20 },
  upload: { minHeight: 80, flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight },
  uploadIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.surface },
  uploadCopy: { flex: 1, marginHorizontal: Spacing.sm },
  uploadTitle: { color: Colors.primaryDark, fontSize: Typography.body, fontWeight: "900" },
  uploadHint: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 17 },
  card: { marginBottom: Spacing.sm, padding: Spacing.md },
  cardMain: { minHeight: 50, flexDirection: "row", alignItems: "center" },
  documentIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  cardCopy: { flex: 1, marginHorizontal: Spacing.sm },
  cardTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  cardMeta: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  cardDetail: { marginTop: 3, color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "700" },
  useButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
  useButtonText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "900" },
  loading: { padding: Spacing.xl },
  disabled: { opacity: 0.55 },
});
