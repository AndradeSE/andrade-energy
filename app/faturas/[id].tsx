import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Directory, File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppHeader, Card, Divider, ElasticScrollView as ScrollView, EmptyState, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarFatura, confirmarFaturaRascunho, formatarDataBrasileira, gerarCobrancaAsaas, regenerarDocumentosFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatarEnergia = (valor: unknown) =>
  `${Number(valor ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kWh`;

export default function DetalheFatura() {
  const { id } = useLocalSearchParams();
  const [fatura, setFatura] = useState<any>();
  const [erro, setErro] = useState(false);
  const [documentoBaixando, setDocumentoBaixando] = useState<string>();
  const [atualizando, setAtualizando] = useState(false);
  const [regenerandoPdf, setRegenerandoPdf] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      setFatura(await buscarFatura(String(id)));
    } catch {
      setErro(true);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar();
    } finally {
      setAtualizando(false);
    }
  }

  async function regenerarPdf() {
    setRegenerandoPdf(true);
    try {
      const atualizada = await regenerarDocumentosFatura(String(id));
      setFatura(atualizada);
      Alert.alert("Fatura atualizada", "O PDF Andrade Energy foi gerado novamente. Abra o download outra vez.");
    } catch {
      Alert.alert("Não foi possível atualizar o PDF", "Tente novamente em instantes.");
    } finally {
      setRegenerandoPdf(false);
    }
  }

  function solicitarConfirmacao() {
    Alert.alert(
      "Confirmar fatura?",
      `Será criada uma cobrança de ${formatarMoeda(Number(fatura?.valor_total_unificado ?? fatura?.valor_total ?? 0))}.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => void confirmarRascunho() },
      ],
    );
  }

  async function confirmarRascunho() {
    try {
      setConfirmando(true);
      const confirmada = await confirmarFaturaRascunho(String(id));
      setFatura(confirmada);
      Alert.alert("Fatura confirmada", "A fatura está aberta e a cobrança foi criada.");
    } catch (erro: any) {
      Alert.alert("Não foi possível confirmar", erro?.response?.data?.message ?? "Atualize a página e tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  async function gerarCobranca() {
    try {
      setGerandoCobranca(true);
      await gerarCobrancaAsaas(String(id));
      await carregar();
      Alert.alert("Cobrança criada", "O boleto e o PIX já estão disponíveis para o cliente.");
    } catch (erro: any) {
      Alert.alert("Não foi possível gerar a cobrança", erro?.response?.data?.message ?? "Confira os dados do cliente e tente novamente.");
    } finally {
      setGerandoCobranca(false);
    }
  }

  if (erro) {
    return (
      <Screen>
        {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Detalhe da fatura" subtitle="Cobranças da carteira" contextTitle="Detalhe da fatura" contextSubtitle="Não foi possível carregar" icon="receipt-outline" /> : null}
        <View style={styles.stateContainer}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar esta fatura"
            subtitle="Verifique sua conexão e tente novamente."
          />
        </View>
      </Screen>
    );
  }

  if (!fatura) return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Detalhe da fatura" subtitle="Cobranças da carteira" contextTitle="Detalhe da fatura" contextSubtitle="Carregando cobrança" icon="receipt-outline" /> : null}<Loading /></Screen>;

  const valorUnificado = Number(
    fatura.valor_total_unificado ?? fatura.valor_total ?? 0
  );
  const faturaSomenteAndrade = Boolean(fatura.fatura_somente_andrade);
  const tituloCobranca = faturaSomenteAndrade ? "Cobrança Andrade Energy" : "Total unificado";
  const descricaoCobranca = faturaSomenteAndrade ? "Energia solar Andrade Energy" : "CEMIG + energia solar Andrade Energy";
  const economiaReal = Number(fatura.economia_real ?? fatura.economia ?? 0);
  const valorSemAndrade = Number(
    fatura.valor_referencia_sem_andrade ??
    Math.max(0, valorUnificado + economiaReal)
  );
  const descontoContratado = Number(
    fatura.desconto_contratado_percentual ?? fatura.desconto_percentual ?? 0
  );
  const descontoReal = Number(fatura.desconto_real_percentual ?? 0);
  const consumoKwh = Number(fatura.consumo_kwh ?? fatura.consumo ?? 0);
  const energiaInjetada = Number(fatura.energia_injetada ?? 0);
  const energiaCompensada = Number(fatura.energia_compensada ?? 0);
  const saldoCreditos = Number(fatura.saldo_atual ?? 0);
  const energiaCobrada = Number(fatura.base_calculo_kwh ?? fatura.energia_compensada ?? fatura.consumo_kwh ?? fatura.consumo ?? 0);
  const tarifaCemig = Number(fatura.tarifa_cheia ?? 0);
  const tarifaAndrade = Number(fatura.tarifa_andrade ?? 0);
  const valorCemigOriginal = Number(fatura.valor_cemig ?? 0);
  const valorCemigRepassado = Number(fatura.valor_cemig_repassado ?? valorCemigOriginal);
  const valorTotalAbsorvido = Number(fatura.valor_total_absorvido ?? 0);
  const valorAbsorvidoDisponibilidade = Number(fatura.valor_absorvido_disponibilidade ?? 0);
  const valorAbsorvidoFioB = Number(fatura.valor_absorvido_fio_b ?? 0);
  const clienteFatura = fatura.clientes ?? {};
  const unidadeFatura = fatura.unidades_consumidoras ?? {};
  const enderecoFatura = unidadeFatura.endereco ?? clienteFatura.endereco ?? "Endereço não informado";
  const possuiCustosGD2 =
    String(fatura.modalidade_faturamento ?? "").toUpperCase() === "COMPENSACAO" &&
    (Number(fatura.custo_disponibilidade ?? 0) > 0 ||
      (Number(fatura.tarifa_gd ?? 0) > 0 && Number(fatura.tarifa_gd) < Number(fatura.tarifa_cheia ?? 0)));

  async function baixarDocumento(url: string | undefined, nomeArquivo: string) {
    if (!url) {
      Alert.alert("Documento em preparação", "Este PDF ainda não está disponível.");
      return;
    }

    try {
      setDocumentoBaixando(nomeArquivo);

      if (Platform.OS !== "web") {
        // Cada abertura recebe uma cópia nova. Alguns leitores Android mantêm
        // o conteúdo anterior para a mesma URI e acabavam exibindo uma folha
        // branca mesmo quando o PDF recém-baixado estava correto.
        const pastaFaturas = new Directory(Paths.cache, "andrade-energy-faturas", String(Date.now()));
        pastaFaturas.create({ idempotent: true, intermediates: true });
        const arquivo = await File.downloadFileAsync(url, pastaFaturas, {
          idempotent: true,
        });
        if (!arquivo.exists || !arquivo.size || arquivo.size < 512) {
          throw new Error("O PDF baixado está vazio.");
        }
        if (Platform.OS === "android") {
          try {
            const contentUri = await FileSystemLegacy.getContentUriAsync(arquivo.uri);
            await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
              data: contentUri,
              flags: 1,
              type: "application/pdf",
            });
            return;
          } catch {
            // Sem leitor padrão, abre o seletor como alternativa.
          }
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(arquivo.uri, { dialogTitle: "Abrir ou salvar fatura", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
        } else {
          Alert.alert("Download concluído", `${nomeArquivo} foi salvo no aplicativo.`);
        }
        return;
      }

      const podeAbrir = await Linking.canOpenURL(url);
      if (!podeAbrir) throw new Error("URL inválida");
      await Linking.openURL(url);
    } catch (erro: any) {
      if (/cancel/i.test(String(erro?.message ?? erro))) return;
      Alert.alert("Não foi possível baixar o PDF", "Confira sua conexão e tente novamente.");
    } finally {
      setDocumentoBaixando(undefined);
    }
  }

  const referenciaArquivo = String(fatura.referencia ?? "fatura")
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  async function copiarPagamento(codigo?: string) {
    if (!codigo) {
      Alert.alert("Pagamento em preparação", "O código PIX ainda não está disponível.");
      return;
    }
    await Clipboard.setStringAsync(codigo);
    Alert.alert("Código PIX copiado", "Cole o código no aplicativo do seu banco para pagar.");
  }

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Detalhe da fatura" subtitle="Cobranças da carteira" contextTitle={`Fatura ${fatura.referencia ?? ""}`.trim()} contextSubtitle={`Vencimento ${formatarDataBrasileira(fatura.vencimento)}`} icon="receipt-outline" /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Fatura {fatura.referencia}</Text>
          <Text style={styles.headingDueDate}>Vencimento {formatarDataBrasileira(fatura.vencimento)}</Text>
        </View>

        <Card style={styles.customerCard}>
          <View style={styles.customerCardIcon}><Ionicons name="person-outline" size={20} color={Colors.primary} /></View>
          <View style={styles.customerCardCopy}>
            <Text style={styles.customerCardLabel}>CLIENTE</Text>
            <Text style={styles.customerCardName}>{clienteFatura.nome ?? "Cliente não informado"}</Text>
            <Text style={styles.customerCardText}>{clienteFatura.cpf ? `CPF/CNPJ: ${clienteFatura.cpf}` : "CPF/CNPJ não informado"}</Text>
            <Text style={styles.customerCardText}>{enderecoFatura}</Text>
          </View>
          <View style={styles.customerCardUnit}>
            <Text style={styles.customerCardLabel}>UNIDADE</Text>
            <Text style={styles.customerCardUnitValue}>UC {fatura.numero_instalacao ?? unidadeFatura.numero ?? "-"}</Text>
            <Text style={styles.customerCardText}>{unidadeFatura.distribuidora ?? fatura.distribuidora ?? "Concessionária"}</Text>
          </View>
        </Card>

        <View style={[styles.downloadActions, styles.downloadActionsTop]}>
          {IS_GERADOR_APP && String(fatura.status ?? "").toUpperCase() === "RASCUNHO" ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.84}
              disabled={confirmando}
              onPress={solicitarConfirmacao}
              style={[styles.confirmButton, confirmando && styles.confirmButtonDisabled]}
            >
              {confirmando ? <ActivityIndicator color={Colors.surface} /> : <Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />}
              <Text style={styles.confirmButtonText}>{confirmando ? "Confirmando..." : "Confirmar fatura"}</Text>
            </TouchableOpacity>
          ) : null}
          {IS_GERADOR_APP ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={regenerarPdf}
              disabled={regenerandoPdf}
              style={styles.regenerateButton}
            >
              <Ionicons name={regenerandoPdf ? "hourglass-outline" : "refresh-outline"} size={18} color={Colors.primary} />
              <Text style={styles.regenerateButtonText}>{regenerandoPdf ? "Atualizando PDF..." : "Gerar PDF atualizado"}</Text>
            </TouchableOpacity>
          ) : null}
          {IS_GERADOR_APP && String(fatura.status ?? "").toUpperCase() !== "RASCUNHO" ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.84}
              disabled={gerandoCobranca}
              onPress={() => void gerarCobranca()}
              style={[styles.confirmButton, gerandoCobranca && styles.confirmButtonDisabled]}
            >
              {gerandoCobranca ? <ActivityIndicator color={Colors.surface} /> : <Ionicons name="barcode-outline" size={20} color={Colors.surface} />}
              <Text style={styles.confirmButtonText}>
                {gerandoCobranca
                  ? "Atualizando cobrança..."
                  : fatura.pdf_boleto_url || fatura.codigo_pix
                    ? "Atualizar boleto, PIX e fatura"
                    : "Gerar boleto, PIX e fatura"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <DownloadButton
            available={Boolean(fatura.pdf_cemig_url)}
            label="Conta original da CEMIG"
            loading={documentoBaixando === `cemig-${referenciaArquivo}.pdf`}
            onPress={() => baixarDocumento(fatura.pdf_cemig_url, `cemig-${referenciaArquivo}.pdf`)}
          />
          <DownloadButton
            available={Boolean(fatura.pdf_unificada_url)}
            label="Fatura Andrade Energy"
            loading={documentoBaixando === `unificada-${referenciaArquivo}.pdf`}
            onPress={() => baixarDocumento(fatura.pdf_unificada_url, `unificada-${referenciaArquivo}.pdf`)}
          />
          <DownloadButton
            available={Boolean(fatura.pdf_boleto_url)}
            label="Boleto"
            loading={documentoBaixando === `boleto-${referenciaArquivo}.pdf`}
            onPress={() => baixarDocumento(fatura.pdf_boleto_url, `boleto-${referenciaArquivo}.pdf`)}
          />
          <TouchableOpacity
            accessibilityLabel="Copiar código PIX"
            activeOpacity={0.82}
            onPress={() => copiarPagamento(fatura.codigo_pix)}
            style={[styles.paymentCode, !fatura.codigo_pix && styles.downloadButtonUnavailable]}
          >
            <View style={styles.downloadIcon}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.surface} />
            </View>
            <View style={styles.downloadContent}>
              <Text style={styles.downloadLabel}>PIX copia e cola</Text>
              <Text numberOfLines={1} style={styles.paymentCodeValue}>{fatura.codigo_pix || "Em preparação"}</Text>
            </View>
            <View style={styles.copyAction}>
              <Ionicons name="copy-outline" size={19} color={Colors.text} />
              <Text style={styles.copyText}>Copiar</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>VALOR TOTAL A PAGAR</Text>
          <Text style={styles.summaryValue}>{formatarMoeda(valorUnificado)}</Text>
          <Text style={styles.summaryCaption}>{descricaoCobranca}</Text>
          <View style={styles.noBenefitHighlight}>
            <Text style={styles.noBenefitLabel}>SEM O BENEFÍCIO ANDRADE ENERGY</Text>
            <Text style={styles.noBenefitValue}>{formatarMoeda(valorSemAndrade)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <ComparisonRow label="Você paga neste mês" value={formatarMoeda(valorUnificado)} emphasis />
          <ComparisonRow label="Sua economia real" value={formatarMoeda(economiaReal)} success />
          <View style={styles.discountPills}>
            <View style={styles.discountPill}><Text style={styles.discountPillLabel}>Desconto contratado</Text><Text style={styles.discountPillValue}>{descontoContratado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Text></View>
            <View style={styles.discountPill}><Text style={styles.discountPillLabel}>Desconto final real</Text><Text style={styles.discountPillValue}>{descontoReal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Text></View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>DEMONSTRATIVO DE ENERGIA E CRÉDITOS</Text>
        <Card style={styles.energyStatementCard}>
          <Text style={styles.energyStatementCaption}>Leitura da competência {fatura.referencia ?? "atual"}</Text>
          <View style={styles.energyGrid}>
            <EnergyMetric icon="flash-outline" label="Consumo da UC" value={formatarEnergia(consumoKwh)} />
            <EnergyMetric icon="git-merge-outline" label="Compensado no mês" value={formatarEnergia(energiaCompensada)} />
            <EnergyMetric icon="sunny-outline" label="Injetado no mês" value={formatarEnergia(energiaInjetada)} />
            <EnergyMetric icon="battery-half-outline" label="Saldo atual de créditos" value={formatarEnergia(saldoCreditos)} highlight />
          </View>
          <Text style={styles.energyStatementFootnote}>O saldo de créditos é o informado na conta da CEMIG e pode ser usado em competências futuras, conforme as regras da distribuidora.</Text>
        </Card>

        <Text style={styles.sectionTitle}>COMPOSIÇÃO DO VALOR</Text>
        <Card>
          <ValueRow label={`Energia considerada (${formatarEnergia(energiaCobrada)})`} value="" />
          <Divider />
          <ValueRow label="Tarifa CEMIG por kWh" value={formatarMoeda(tarifaCemig)} />
          <Divider />
          <ValueRow label="Tarifa Andrade Energy por kWh" value={formatarMoeda(tarifaAndrade)} />
          <Divider />
          {!faturaSomenteAndrade ? <><ValueRow label="Conta original da CEMIG" value={formatarMoeda(valorCemigOriginal)} /><Divider />{valorTotalAbsorvido > 0 ? <><ValueRow label="Custos assumidos pela usina" value={`− ${formatarMoeda(valorTotalAbsorvido)}`} /><Divider /><ValueRow label="Parcela CEMIG do cliente" value={formatarMoeda(valorCemigRepassado)} /><Divider /></> : null}</> : null}
          <ValueRow label="Energia solar Andrade Energy" value={formatarMoeda(Number(fatura.valor_usina ?? fatura.valor_andrade ?? 0))} />
          <Divider />
          <ValueRow label={tituloCobranca} value={formatarMoeda(valorUnificado)} emphasis />
        </Card>
        <Text style={styles.calculationHint}>{faturaSomenteAndrade ? "Cálculo: energia solar Andrade Energy. A conta da CEMIG é paga diretamente à concessionária." : valorTotalAbsorvido > 0 ? "Cálculo: conta CEMIG − custos assumidos pela usina + energia solar = total unificado." : "Cálculo: conta CEMIG + energia solar Andrade Energy = total unificado."} As tarifas por kWh mostram os valores usados nesta competência.</Text>

        {valorTotalAbsorvido > 0 ? <Card><ValueRow label="Disponibilidade absorvida" value={formatarMoeda(valorAbsorvidoDisponibilidade)} /><Divider /><ValueRow label="Fio B absorvido" value={formatarMoeda(valorAbsorvidoFioB)} /></Card> : null}

        {possuiCustosGD2 ? <View style={styles.gd2Notice}><Ionicons name="information-circle-outline" size={21} color="#8A5A00" /><View style={styles.gd2Copy}><Text style={styles.gd2Title}>Entenda o desconto real na GD II</Text><Text style={styles.gd2Text}>Custos obrigatórios da rede e de disponibilidade continuam na conta da CEMIG. Por isso, o desconto final pode ser menor que o desconto contratado.</Text></View></View> : null}

        <Text style={styles.sectionTitle}>DADOS DA FATURA</Text>
        <Card>
          <DataRow icon="cash-outline" label="Valor" value={formatarMoeda(valorUnificado)} />
          <Divider />
          <DataRow icon="calendar-outline" label="Período" value={fatura.referencia || "Não informado"} />
          <Divider />
          <DataRow icon="calendar-number-outline" label="Vencimento" value={formatarDataBrasileira(fatura.vencimento)} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function DataRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataIcon}><Ionicons name={icon} size={18} color={Colors.surface} /></View>
      <View style={styles.dataContent}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataValue}>{value}</Text>
      </View>
    </View>
  );
}

function ComparisonRow({ label, value, emphasis = false, success = false }: { label: string; value: string; emphasis?: boolean; success?: boolean }) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={[styles.comparisonLabel, emphasis && styles.comparisonLabelEmphasis, success && styles.comparisonLabelSuccess]}>{label}</Text>
      <Text style={[styles.comparisonValue, emphasis && styles.comparisonValueEmphasis, success && styles.comparisonValueSuccess]}>{value}</Text>
    </View>
  );
}

function ValueRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.valueRow}>
      <Text style={[styles.rowLabel, emphasis && styles.emphasisLabel]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.emphasisValue]}>{value}</Text>
    </View>
  );
}

function EnergyMetric({ icon, label, value, highlight = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.energyMetric, highlight && styles.energyMetricHighlight]}>
      <Ionicons name={icon} size={18} color={highlight ? Colors.primary : Colors.subtitle} />
      <Text style={styles.energyMetricLabel}>{label}</Text>
      <Text style={[styles.energyMetricValue, highlight && styles.energyMetricValueHighlight]}>{value}</Text>
    </View>
  );
}

function DownloadButton({
  available,
  label,
  loading,
  onPress,
}: {
  available: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      activeOpacity={0.82}
      disabled={loading}
      onPress={onPress}
      style={[styles.downloadButton, !available && styles.downloadButtonUnavailable]}
    >
      <View style={styles.downloadIcon}>
        <Ionicons
          name={loading ? "hourglass-outline" : available ? "download-outline" : "time-outline"}
          size={22}
          color={Colors.surface}
        />
      </View>
      <View style={styles.downloadContent}>
        <Text style={styles.downloadLabel}>
          {loading ? "Baixando PDF..." : label}
        </Text>
        {!available ? <Text style={styles.downloadStatus}>Em preparação</Text> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.text}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  heading: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "800",
  },
  headingDueDate: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FBF9",
  },
  customerCardIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  customerCardCopy: { flex: 1, marginLeft: Spacing.sm },
  customerCardLabel: { color: Colors.subtitle, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  customerCardName: { marginTop: 3, color: Colors.text, fontSize: Typography.small, fontWeight: "900" },
  customerCardText: { marginTop: 3, color: Colors.subtitle, fontSize: 10, lineHeight: 15 },
  customerCardUnit: { width: 82, alignItems: "flex-end", marginLeft: Spacing.sm },
  customerCardUnitValue: { marginTop: 3, color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "900", textAlign: "right" },
  summaryCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#BFE7D6",
    borderRadius: Radius.lg,
    backgroundColor: "#F4FBF8",
  },
  summaryEyebrow: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  summaryValue: {
    marginTop: Spacing.xs,
    color: Colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  summaryCaption: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  summaryDivider: {
    height: 1,
    marginVertical: Spacing.md,
    backgroundColor: "#CFE9DD",
  },
  comparisonRow: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  comparisonLabel: {
    flex: 1,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  comparisonLabelEmphasis: {
    color: Colors.text,
    fontWeight: "800",
  },
  comparisonLabelSuccess: {
    color: Colors.primaryDark,
    fontWeight: "800",
  },
  comparisonValue: {
    color: Colors.text,
    fontSize: Typography.small,
    fontWeight: "800",
  },
  comparisonValueEmphasis: {
    color: Colors.primaryDark,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  comparisonValueSuccess: {
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  discountPills: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  discountPill: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  discountPillLabel: {
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
  },
  discountPillValue: {
    marginTop: 2,
    color: Colors.primaryDark,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  downloadActionsTop: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  regenerateButton: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  regenerateButtonText: {
    fontSize: Typography.caption,
    fontWeight: "800",
    color: Colors.primary,
  },
  confirmButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
  },
  confirmButtonDisabled: { opacity: 0.65 },
  confirmButtonText: { color: Colors.surface, fontSize: Typography.caption, fontWeight: "900" },
  noBenefitHighlight: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: "#B8D8CA",
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  noBenefitLabel: {
    color: Colors.subtitle,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  noBenefitValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "900",
  },
  energyStatementCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FBF9",
  },
  energyStatementCaption: {
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  energyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  energyMetric: {
    width: "50%",
    minHeight: 98,
    padding: Spacing.sm,
    justifyContent: "flex-start",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  energyMetricHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  energyMetricLabel: {
    marginTop: 6,
    minHeight: 28,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
  energyMetricValue: {
    marginTop: 6,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  energyMetricValueHighlight: {
    color: Colors.primaryDark,
    fontSize: Typography.card,
  },
  energyStatementFootnote: {
    marginTop: Spacing.sm,
    color: Colors.subtitle,
    fontSize: 11,
    lineHeight: 16,
  },
  gd2Notice: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "#FFF7E8",
  },
  gd2Copy: {
    flex: 1,
  },
  gd2Title: {
    color: "#8A5A00",
    fontSize: Typography.small,
    fontWeight: "900",
  },
  gd2Text: {
    marginTop: 3,
    color: "#725B2D",
    fontSize: Typography.caption,
    lineHeight: 18,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary,
  },
  heroBackground: {
    borderRadius: Radius.xl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  heroValue: {
    marginTop: Spacing.md,
    color: Colors.surface,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
  dueDate: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  dueDateText: {
    marginLeft: Spacing.xs,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.small,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  valueRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    flex: 1,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  rowValue: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  calculationHint: {
    marginTop: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    lineHeight: 18,
  },
  emphasisLabel: {
    color: Colors.text,
    fontWeight: "700",
  },
  emphasisValue: {
    color: Colors.primary,
    fontSize: Typography.card,
  },
  infoRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLabel: {
    flex: 1,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  infoValue: {
    maxWidth: "48%",
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
    textAlign: "right",
  },
  discountCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
  },
  discountIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
  },
  discountContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  discountLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  discountValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "800",
  },
  realDiscount: {
    alignItems: "flex-end",
  },
  realDiscountLabel: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  realDiscountValue: {
    marginTop: 3,
    color: Colors.primaryDark,
    fontSize: Typography.section,
    fontWeight: "800",
  },
  savingHint: {
    marginTop: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.small,
    lineHeight: 18,
  },
  downloadActions: {
    gap: Spacing.sm,
  },
  downloadButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "#DEE0E3",
  },
  downloadButtonUnavailable: {
    opacity: 0.66,
  },
  paymentCode: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "#DEE0E3",
  },
  paymentCodeValue: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  copyAction: {
    alignItems: "center",
  },
  copyText: {
    marginTop: 2,
    color: Colors.text,
    fontSize: 9,
    fontWeight: "700",
  },
  downloadIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: "#9CA3AF",
  },
  downloadContent: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  downloadLabel: {
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "800",
  },
  downloadLabelUnavailable: {
    color: Colors.text,
  },
  downloadStatus: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  downloadStatusUnavailable: {
    color: Colors.subtitle,
  },
  dataRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
  },
  dataIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: "#9CA3AF",
  },
  dataContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dataLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  dataValue: {
    marginTop: 2,
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "800",
  },
});
