import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Card, Divider, EmptyState, Loading, Screen } from "../../components/ui";
import { buscarFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function DetalheFatura() {
  const { id } = useLocalSearchParams();
  const [fatura, setFatura] = useState<any>();
  const [erro, setErro] = useState(false);
  const [documentoBaixando, setDocumentoBaixando] = useState<string>();

  useEffect(() => {
    buscarFatura(String(id))
      .then(setFatura)
      .catch(() => setErro(true));
  }, [id]);

  if (erro) {
    return (
      <Screen>
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

  if (!fatura) return <Loading />;

  const valorUnificado = Number(
    fatura.valor_total_unificado ?? fatura.valor_total ?? 0
  );

  async function baixarDocumento(url: string | undefined, nomeArquivo: string) {
    if (!url) {
      Alert.alert("Documento em preparação", "Este PDF ainda não está disponível.");
      return;
    }

    try {
      setDocumentoBaixando(nomeArquivo);

      if (Platform.OS !== "web") {
        const destino = new File(Paths.cache, nomeArquivo);
        const arquivo = await File.downloadFileAsync(url, destino, {
          idempotent: true,
        });
        const podeCompartilhar = await Sharing.isAvailableAsync();

        if (podeCompartilhar) {
          await Sharing.shareAsync(arquivo.uri, {
            dialogTitle: "Salvar ou compartilhar fatura",
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
          return;
        }
      }

      const podeAbrir = await Linking.canOpenURL(url);
      if (!podeAbrir) throw new Error("URL inválida");
      await Linking.openURL(url);
    } catch {
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Fatura {fatura.referencia}</Text>
          <Text style={styles.headingDueDate}>Vencimento {fatura.vencimento}</Text>
        </View>

        <View style={styles.downloadActions}>
          <DownloadButton
            available={Boolean(fatura.pdf_cemig_url)}
            label="Fatura da concessionária"
            loading={documentoBaixando === `cemig-${referenciaArquivo}.pdf`}
            onPress={() =>
              baixarDocumento(
                fatura.pdf_cemig_url,
                `cemig-${referenciaArquivo}.pdf`
              )
            }
          />
          <DownloadButton
            available={Boolean(fatura.pdf_unificada_url)}
            label="Fatura unificada Andrade Energy"
            loading={documentoBaixando === `unificada-${referenciaArquivo}.pdf`}
            onPress={() =>
              baixarDocumento(
                fatura.pdf_unificada_url,
                `unificada-${referenciaArquivo}.pdf`
              )
            }
          />
          <DownloadButton
            available={Boolean(fatura.pdf_boleto_url)}
            label="Boleto"
            loading={documentoBaixando === `boleto-${referenciaArquivo}.pdf`}
            onPress={() =>
              baixarDocumento(fatura.pdf_boleto_url, `boleto-${referenciaArquivo}.pdf`)
            }
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
              <Text numberOfLines={1} style={styles.paymentCodeValue}>
                {fatura.codigo_pix || "Em preparação"}
              </Text>
            </View>
            <View style={styles.copyAction}>
              <Ionicons name="copy-outline" size={19} color={Colors.text} />
              <Text style={styles.copyText}>Copiar</Text>
            </View>
          </TouchableOpacity>
        </View>

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
