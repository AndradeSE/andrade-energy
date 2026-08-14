import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge, Card, EmptyState, Loading, Screen } from "../../components/ui";
import { useFaturas } from "../../hooks/useFaturas";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type BadgeVariant = "success" | "warning" | "danger" | "info";

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarStatus(status?: string) {
  return (status ?? "").trim().toUpperCase();
}

function badgeVariant(status?: string): BadgeVariant {
  switch (normalizarStatus(status)) {
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

export default function Faturas() {
  const { data, isLoading, error } = useFaturas();

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <Screen>
        <View style={styles.stateContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar suas faturas"
            subtitle="Verifique sua conexão e tente novamente em alguns instantes."
          />
        </View>
      </Screen>
    );
  }

  const faturas = data ?? [];
  const faturasAbertas = faturas.filter((item: any) =>
    ["EM ABERTO", "ABERTA", "VENCIDA"].includes(normalizarStatus(item.status))
  ).length;

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.content}
        data={faturas}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>SUA ENERGIA</Text>
              <Text style={styles.title}>Faturas</Text>
              <Text style={styles.subtitle}>
                Acompanhe cobranças, vencimentos e seu histórico de consumo.
              </Text>
            </View>

            <ImageBackground
              imageStyle={styles.summaryBackground}
              resizeMode="cover"
              source={require("../../assets/images/background.png")}
              style={styles.summary}
            >
              <View style={styles.summaryOverlay} />
              <View style={styles.summaryIcon}>
                <Ionicons name="receipt-outline" size={23} color={Colors.primary} />
              </View>

              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Visão geral</Text>
                <Text style={styles.summaryValue}>
                  {faturas.length} {faturas.length === 1 ? "fatura" : "faturas"}
                </Text>
              </View>

              {faturasAbertas > 0 ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingText}>
                    {faturasAbertas} {faturasAbertas === 1 ? "pendente" : "pendentes"}
                  </Text>
                </View>
              ) : null}
            </ImageBackground>

            {faturas.length > 0 ? (
              <Text style={styles.sectionTitle}>Histórico de faturas</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nenhuma fatura encontrada"
            subtitle="Assim que houver uma cobrança, ela aparecerá aqui."
          />
        }
        renderItem={({ item }) => {
          const valor = Number(item.valor_total ?? item.valor_final ?? 0);
          const energia = Number(item.energia_compensada ?? item.consumo_kwh ?? 0);
          const status = item.status || "Não informado";

          return (
            <TouchableOpacity
              accessibilityLabel={`Abrir fatura ${item.referencia}`}
              activeOpacity={0.86}
              onPress={() => router.push(`/faturas/${item.id}`)}
            >
              <Card>
                <View style={styles.cardHeader}>
                  <View style={styles.referenceContent}>
                    <Text style={styles.referenceLabel}>COMPETÊNCIA</Text>
                    <Text style={styles.reference}>{item.referencia}</Text>
                  </View>

                  <Badge label={status} variant={badgeVariant(status)} />
                </View>

                <Text style={styles.value}>{formatarMoeda(valor)}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.detail}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={Colors.subtitle}
                    />
                    <Text style={styles.detailText}>
                      Vence em {item.vencimento || "data não informada"}
                    </Text>
                  </View>

                  <View style={styles.detail}>
                    <Ionicons
                      name="flash-outline"
                      size={17}
                      color={Colors.primary}
                    />
                    <Text style={styles.energy}>
                      {energia.toLocaleString("pt-BR")} kWh
                    </Text>
                  </View>
                </View>

                <View style={styles.openRow}>
                  <Text style={styles.openText}>Ver detalhes da fatura</Text>
                  <Ionicons name="chevron-forward" size={19} color={Colors.primary} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  stateContent: {
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
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    lineHeight: 20,
  },
  summary: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
  },
  summaryBackground: {
    borderRadius: Radius.lg,
  },
  summaryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
  },
  summaryIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  summaryContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  summaryLabel: {
    color: "#CBD5E1",
    fontSize: Typography.small,
  },
  summaryValue: {
    marginTop: 2,
    color: Colors.surface,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  pendingPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
  },
  pendingText: {
    color: Colors.warning,
    fontSize: Typography.small,
    fontWeight: "700",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  referenceContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  referenceLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  reference: {
    marginTop: 4,
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },
  value: {
    marginTop: Spacing.lg,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: Spacing.lg,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  detailText: {
    marginLeft: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  energy: {
    marginLeft: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "600",
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  openText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
});
