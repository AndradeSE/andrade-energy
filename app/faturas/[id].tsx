import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge, Card, Divider, EmptyState, Loading, Screen } from "../../components/ui";
import { buscarFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type BadgeVariant = "success" | "warning" | "danger" | "info";

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatarNumero = (valor: number, casas = 0) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

function badgeVariant(status?: string): BadgeVariant {
  switch ((status ?? "").toUpperCase()) {
    case "PAGA":
      return "success";
    case "VENCIDA":
      return "danger";
    case "EM ABERTO":
    case "ABERTA":
      return "warning";
    default:
      return "info";
  }
}

export default function DetalheFatura() {
  const { id } = useLocalSearchParams();
  const [fatura, setFatura] = useState<any>();
  const [erro, setErro] = useState(false);

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

  const valorCemig = Number(fatura.valor_cemig ?? 0);
  const valorUsina = Number(fatura.valor_usina ?? fatura.valor_andrade ?? 0);
  const valorUnificado = Number(
    fatura.valor_total_unificado ?? fatura.valor_total ?? valorCemig + valorUsina
  );
  const modalidade =
    fatura.modalidade_faturamento === "INJECAO" ? "Por injeção" : "Por compensação";
  const baseCalculo = Number(
    fatura.base_calculo_kwh ??
      (fatura.modalidade_faturamento === "INJECAO"
        ? fatura.energia_injetada
        : fatura.energia_compensada) ??
      0
  );

  async function abrirDocumento(url?: string) {
    if (!url) {
      Alert.alert("Documento em preparação", "Este PDF ainda não está disponível.");
      return;
    }

    try {
      const podeAbrir = await Linking.canOpenURL(url);
      if (!podeAbrir) throw new Error("URL inválida");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Não foi possível abrir o PDF", "Confira sua conexão e tente novamente.");
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>FATURA UNIFICADA</Text>
          <Text style={styles.title}>{fatura.referencia}</Text>
        </View>

        <ImageBackground
          imageStyle={styles.heroBackground}
          resizeMode="cover"
          source={require("../../assets/images/background.png")}
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total a pagar</Text>
            <Badge label={fatura.status || "Aberta"} variant={badgeVariant(fatura.status)} />
          </View>
          <Text style={styles.heroValue}>{formatarMoeda(valorUnificado)}</Text>
          <View style={styles.dueDate}>
            <Ionicons name="calendar-outline" size={16} color="#CBD5E1" />
            <Text style={styles.dueDateText}>Vence em {fatura.vencimento}</Text>
          </View>
        </ImageBackground>

        <Text style={styles.sectionTitle}>Composição da cobrança</Text>
        <Card>
          <ValueRow label="Fatura original CEMIG" value={formatarMoeda(valorCemig)} />
          <Divider />
          <ValueRow label="Fatura da usina" value={formatarMoeda(valorUsina)} />
          <Divider />
          <ValueRow
            emphasis
            label="Total unificado"
            value={formatarMoeda(valorUnificado)}
          />
        </Card>

        <Text style={styles.sectionTitle}>Memória de cálculo</Text>
        <Card>
          <InfoRow label="Modalidade" value={modalidade} />
          <Divider />
          <InfoRow label="Energia-base" value={`${formatarNumero(baseCalculo)} kWh`} />
          <Divider />
          <InfoRow
            label="Tarifa cheia CEMIG"
            value={`${formatarMoeda(Number(fatura.tarifa_cheia ?? 0))}/kWh`}
          />
          <Divider />
          <InfoRow
            label="Valor da energia sem desconto"
            value={formatarMoeda(Number(fatura.valor_energia_cheia ?? 0))}
          />
        </Card>

        <View style={styles.discountCard}>
          <View style={styles.discountIcon}>
            <Ionicons name="trending-down" size={23} color={Colors.primary} />
          </View>
          <View style={styles.discountContent}>
            <Text style={styles.discountLabel}>Desconto contratado na energia</Text>
            <Text style={styles.discountValue}>
              {formatarNumero(
                Number(
                  fatura.desconto_contratado_percentual ??
                    fatura.desconto_percentual ??
                    0
                ),
                2
              )}%
            </Text>
          </View>
          <View style={styles.realDiscount}>
            <Text style={styles.realDiscountLabel}>DESCONTO REAL</Text>
            <Text style={styles.realDiscountValue}>
              {formatarNumero(Number(fatura.desconto_real_percentual ?? 0), 2)}%
            </Text>
          </View>
        </View>

        <Card>
          <ValueRow
            emphasis
            label="Economia real neste mês"
            value={formatarMoeda(Number(fatura.economia_real ?? fatura.economia ?? 0))}
          />
          <Text style={styles.savingHint}>
            O desconto real considera a conta completa, incluindo impostos, encargos e custo
            de disponibilidade.
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Documentos</Text>
        <Card>
          <DocumentRow
            available={Boolean(fatura.pdf_cemig_url)}
            label="Fatura original CEMIG"
            onPress={() => abrirDocumento(fatura.pdf_cemig_url)}
          />
          <Divider />
          <DocumentRow
            available={Boolean(fatura.pdf_usina_url)}
            label="Fatura da usina"
            onPress={() => abrirDocumento(fatura.pdf_usina_url)}
          />
          <Divider />
          <DocumentRow
            available={Boolean(fatura.pdf_unificada_url)}
            label="Fatura unificada"
            onPress={() => abrirDocumento(fatura.pdf_unificada_url)}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function ValueRow({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.valueRow}>
      <Text style={[styles.rowLabel, emphasis && styles.emphasisLabel]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.emphasisValue]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function DocumentRow({
  available,
  label,
  onPress,
}: {
  available: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.documentRow}>
      <View style={styles.documentIcon}>
        <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
      </View>
      <View style={styles.documentContent}>
        <Text style={styles.documentLabel}>{label}</Text>
        <Text style={styles.documentStatus}>
          {available ? "Disponível para download" : "Em preparação"}
        </Text>
      </View>
      <Ionicons
        name={available ? "download-outline" : "time-outline"}
        size={20}
        color={available ? Colors.primary : Colors.subtitle}
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
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  title: {
    marginTop: 4,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "800",
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
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    fontWeight: "700",
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
  documentRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  documentContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  documentLabel: {
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  documentStatus: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
});
