import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import { buscarFatura } from "../../services/faturas.service";
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
        const destino = new File(Paths.document, nomeArquivo);
        const arquivo = await File.downloadFileAsync(url, destino, {
          idempotent: true,
        });
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
            // Usa o seletor do sistema quando o aparelho não possui visualizador padrão.
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
      {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Detalhe da fatura" subtitle="Cobranças da carteira" contextTitle={`Fatura ${fatura.referencia ?? ""}`.trim()} contextSubtitle={`Vencimento ${fatura.vencimento ?? "não informado"}`} icon="receipt-outline" /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Fatura {fatura.referencia}</Text>
          <Text style={styles.headingDueDate}>Vencimento {fatura.vencimento}</Text>
        </View>

        <View style={[styles.downloadActions, styles.downloadActionsTop]}>
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
          <Text style={styles.summaryCaption}>CEMIG + energia solar Andrade Energy</Text>
          <View style={styles.summaryDivider} />
          <ComparisonRow label="Sem o benefício Andrade Energy" value={formatarMoeda(valorSemAndrade)} />
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
            <EnergyMetric icon="battery-half-outline" label="Saldo de créditos" value={formatarEnergia(saldoCreditos)} highlight />
          </View>
          <Text style={styles.energyStatementFootnote}>O saldo de créditos é o informado na conta da CEMIG e pode ser usado em competências futuras, conforme as regras da distribuidora.</Text>
        </Card>

        <Text style={styles.sectionTitle}>COMPOSIÇÃO DO VALOR</Text>
        <Card>
          <ValueRow label="Parte que permanece na CEMIG" value={formatarMoeda(Number(fatura.valor_cemig ?? 0))} />
          <Divider />
          <ValueRow label="Energia solar Andrade Energy" value={formatarMoeda(Number(fatura.valor_usina ?? fatura.valor_andrade ?? 0))} />
          <Divider />
          <ValueRow label="Total a pagar" value={formatarMoeda(valorUnificado)} emphasis />
        </Card>

        {possuiCustosGD2 ? <View style={styles.gd2Notice}><Ionicons name="information-circle-outline" size={21} color="#8A5A00" /><View style={styles.gd2Copy}><Text style={styles.gd2Title}>Entenda o desconto real na GD II</Text><Text style={styles.gd2Text}>Custos obrigatórios da rede e de disponibilidade continuam na conta da CEMIG. Por isso, o desconto final pode ser menor que o desconto contratado.</Text></View></View> : null}

        <Text style={styles.sectionTitle}>DADOS DA FATURA</Text>
        <Card>
          <DataRow icon="cash-outline" label="Valor" value={formatarMoeda(valorUnificado)} />
          <Divider />
          <DataRow icon="calendar-outline" label="Período" value={fatura.referencia || "Não informado"} />
          <Divider />
          <DataRow icon="calendar-number-outline" label="Vencimento" value={fatura.vencimento || "Não informado"} />
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
    minHeight: 86,
    padding: Spacing.sm,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  energyMetricHighlight: {
    backgroundColor: Colors.primaryLight,
  },
  energyMetricLabel: {
    marginTop: 6,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
  },
  energyMetricValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  energyMetricValueHighlight: {
    color: Colors.primaryDark,
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
