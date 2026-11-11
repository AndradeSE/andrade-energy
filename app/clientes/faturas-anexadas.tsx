import { Loading } from "../../components/ui";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "../../components/assistant/AssistantNativeControls";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, EmptyState, Screen } from "../../components/ui";
import PdfPasswordRetryModal from "../../components/PdfPasswordRetryModal";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { anexarFaturaCliente, excluirFaturaAnexadaCliente, FaturaAnexadaCliente, listarFaturasAnexadasCliente, listarUnidadesCliente } from "../../services/clientes.service";
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
  const { user, usinaSelecionada, suspenderBloqueioTemporariamente } = useAuth();
  const clienteId = String(params.clienteId ?? user?.cliente_id ?? "");
  const selecionarUc = IS_GERADOR_APP && params.selecionarUc === "1";
  const [zona, setZona] = useState<"" | "RURAL" | "URBANA">("");
  const [mostrarSenhaPdf, setMostrarSenhaPdf] = useState(false);
  const [faturas, setFaturas] = useState<FaturaAnexadaCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [excluindoId, setExcluindoId] = useState("");
  const [senhaInformada, setSenhaInformada] = useState("");
  const [pdfPendente, setPdfPendente] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pedindoSenhaPdf, setPedindoSenhaPdf] = useState(false);

  const titulo = selecionarUc ? "Escolher fatura para UC" : IS_GERADOR_APP ? "Contas vinculadas ao CPF" : "Solicitar cadastro de nova UC";
  const subtitulo = selecionarUc
    ? "Escolha uma conta já anexada para preencher a unidade consumidora."
    : IS_GERADOR_APP
      ? "Contas da concessionária enviadas pelo consumidor ficam disponíveis para consulta e cadastro de UC."
      : "Anexe a conta da concessionária da nova unidade em seu nome. O gerador vai usar a fatura para analisar o cadastro.";

  const carregar = useCallback(async () => {
    if (!clienteId) {
      setCarregando(false);
      return;
    }
    try {
      const [anexos, unidades] = await Promise.all([
        listarFaturasAnexadasCliente(clienteId),
        IS_GERADOR_APP && usinaSelecionada?.id && !selecionarUc ? listarUnidadesCliente(clienteId) : Promise.resolve([]),
      ]);
      const numeros = new Set(unidades.filter((unidade: any) => unidade.usina_id === usinaSelecionada?.id).map((unidade: any) => String(unidade.numero ?? "").replace(/\D/g, "")));
      setFaturas(IS_GERADOR_APP && usinaSelecionada?.id && !selecionarUc
        ? anexos.filter((anexo) => anexo.dadosFatura?.solicitacao_nova_uc === true || numeros.has(String(anexo.dadosFatura?.uc ?? anexo.dadosFatura?.numero_instalacao ?? "").replace(/\D/g, "")))
        : anexos);
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? "Tente atualizar novamente.");
    } finally {
      setCarregando(false);
    }
  }, [clienteId, selecionarUc, usinaSelecionada?.id]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }

  async function selecionarArquivo(pdfReenvio?: DocumentPicker.DocumentPickerAsset, senhaPdf = "") {
    if (!clienteId || enviando || (!IS_GERADOR_APP && (!zona || !pdfReenvio))) return;
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const resultado = pdfReenvio ? null : await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
      if (resultado?.canceled || (!pdfReenvio && !resultado?.assets?.[0])) return;
      setEnviando(true);
      const pdf = pdfReenvio ?? resultado!.assets[0];
      setPdfPendente(pdf);
      await anexarFaturaCliente(clienteId, pdf, senhaPdf, IS_GERADOR_APP ? usinaSelecionada?.id : undefined, zona || undefined);
      await carregar();
      setPdfPendente(null);
      setSenhaInformada("");
      Alert.alert(IS_GERADOR_APP ? "Conta anexada" : "Solicitação enviada", IS_GERADOR_APP ? "A conta foi salva no perfil do cliente." : "O gerador será avisado e vai conferir a fatura. A unidade aparecerá na sua lista após a conclusão do cadastro.");
    } catch (erro: any) {
      if (erro?.response?.data?.code === "PDF_PASSWORD_REQUIRED") { setPedindoSenhaPdf(true); return; }
      Alert.alert("Não foi possível anexar", erro?.response?.data?.message ?? "Confira o PDF ou foto da CEMIG e tente novamente.");
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
        origemFaturaPerfil: "1",
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

  function confirmarExclusao(fatura: FaturaAnexadaCliente) {
    Alert.alert(
      "Excluir fatura anexada",
      `Deseja excluir definitivamente ${fatura.nome || "esta conta de energia"} do perfil do cliente?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setExcluindoId(fatura.id);
              await excluirFaturaAnexadaCliente(clienteId, fatura.id);
              setFaturas((atuais) => atuais.filter((item) => item.id !== fatura.id));
            } catch (erro: any) {
              Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? "Tente novamente.");
            } finally {
              setExcluindoId("");
            }
          },
        },
      ],
    );
  }

  const quantidade = useMemo(() => faturas.length, [faturas.length]);

  if (carregando) return <Screen><Loading /></Screen>;

  return <Screen>
    {IS_GERADOR_APP ? <AppHeader variant="subpage" title={titulo} subtitle={params.cliente ? `Cliente: ${params.cliente}` : "Documentos do cliente"} contextTitle={`${quantidade} fatura${quantidade === 1 ? "" : "s"} anexada${quantidade === 1 ? "" : "s"}`} contextSubtitle={selecionarUc ? "Selecione para cadastrar a UC" : "Contas particulares da concessionária"} icon="document-text-outline" /> : null}
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}>
      {!IS_GERADOR_APP ? <View style={styles.heading}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={Colors.text} /></TouchableOpacity><View style={styles.headingCopy}><Text style={styles.title}>{titulo}</Text><Text style={styles.subtitle}>{subtitulo}</Text></View></View> : <Text style={styles.description}>{subtitulo}</Text>}
      {!IS_GERADOR_APP ? <Card style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
        <Text style={styles.description}>Anexe a fatura da nova UC em seu nome e informe a localização. Ao enviar, o gerador recebe um aviso e confere os dados. Depois de concluir o cadastro, ele libera a unidade na sua lista.</Text>
        <ChoiceField label="Localização da nova UC" value={zona} onChange={setZona} options={[{ label: "Rural", value: "RURAL" }, { label: "Urbana", value: "URBANA" }]} disabled={enviando} />
        <Button title={pdfPendente ? "Trocar arquivo da fatura" : "Anexar PDF ou foto da fatura"} disabled={enviando} onPress={async () => {
          const retomar = suspenderBloqueioTemporariamente();
          try {
            const resultado = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
            if (!resultado.canceled && resultado.assets[0]) {
              setPdfPendente(resultado.assets[0]);
              setSenhaInformada("");
              setMostrarSenhaPdf(false);
            }
          } catch { Alert.alert("Não foi possível selecionar o arquivo"); }
          finally { retomar(); }
        }} />
        {pdfPendente ? <>
          <Text>{pdfPendente.name}</Text>
          <Button title="Remover arquivo" disabled={enviando} onPress={() => { setPdfPendente(null); setSenhaInformada(""); }} />
        </> : null}
        <View>
          <View>
            <FormField label="Senha do PDF" placeholder="Opcional" value={senhaInformada} onChangeText={setSenhaInformada} secureTextEntry={!mostrarSenhaPdf} autoCapitalize="none" autoCorrect={false} editable={!enviando} style={styles.passwordInput} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={mostrarSenhaPdf ? "Ocultar senha do PDF" : "Mostrar senha do PDF"}
              onPress={() => setMostrarSenhaPdf((visivel) => !visivel)}
              style={styles.passwordToggle}
            >
              {mostrarSenhaPdf ? (
                <Ionicons name="eye-outline" size={22} color={Colors.subtitle} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path
                    d="M3 9c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M6 12l-2 3m6-1.7-1 3.7m5-3.7 1 3.7m3-5 2 3"
                    fill="none"
                    stroke={Colors.subtitle}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.passwordHint}>Se o PDF não tiver senha, deixe em branco.</Text>
        </View>
        <Button title={enviando ? "Enviando…" : "Enviar solicitação"} disabled={!clienteId || !zona || !pdfPendente || enviando} onPress={() => { if (pdfPendente) void selecionarArquivo(pdfPendente, senhaInformada); }} />
      </Card> : null}
      {IS_GERADOR_APP && !selecionarUc ? <TouchableOpacity disabled={!clienteId || enviando} onPress={() => void selecionarArquivo()} style={[styles.upload, (!clienteId || enviando) && styles.disabled]}>
        <View style={styles.uploadIcon}>{enviando ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />}</View>
        <View style={styles.uploadCopy}><Text style={styles.uploadTitle}>{enviando ? "Anexando conta..." : IS_GERADOR_APP ? "Anexar conta vinculada ao CPF" : "Anexar fatura da nova UC"}</Text><Text style={styles.uploadHint}>PDF ou foto da concessionária de uma UC do seu CPF; ficará disponível também para o gerador.</Text></View>
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
          <TouchableOpacity accessibilityRole="button" disabled={!!excluindoId} onPress={() => confirmarExclusao(fatura)} style={[styles.deleteButton, excluindoId === fatura.id && styles.disabled]}>{excluindoId === fatura.id ? <ActivityIndicator size="small" color={Colors.danger} /> : <Ionicons name="trash-outline" size={18} color={Colors.danger} />}<Text style={styles.deleteButtonText}>{excluindoId === fatura.id ? "Excluindo..." : "Excluir arquivo enviado"}</Text></TouchableOpacity>
        </Card>;
      }) : <EmptyState icon="document-outline" title="Nenhuma conta anexada" subtitle={selecionarUc ? "O cliente ainda não enviou uma conta de energia." : "Anexe uma conta da concessionária de uma unidade vinculada ao seu CPF."} />}
    </ScrollView>
    <PdfPasswordRetryModal visible={pedindoSenhaPdf} busy={enviando} onCancel={() => { setPedindoSenhaPdf(false); if (IS_GERADOR_APP) setPdfPendente(null); }} onConfirm={(password) => { const pdf = pdfPendente; setPedindoSenhaPdf(false); if (pdf) void selecionarArquivo(pdf, password); }} />
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
  passwordHint: { marginTop: -Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 20 },
  passwordInput: { paddingRight: 52 },
  passwordToggle: { position: "absolute", right: 4, bottom: Spacing.md, width: 48, height: 50, alignItems: "center", justifyContent: "center" },
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
  deleteButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xs, borderWidth: 1, borderColor: "#F1B7B7", borderRadius: Radius.md, backgroundColor: "#FFF7F7" },
  deleteButtonText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "800" },
  loading: { padding: Spacing.xl },
  disabled: { opacity: 0.55 },
});
