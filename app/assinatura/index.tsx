import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AppHeader,
  ElasticScrollView as ScrollView,
  Loading,
  Screen,
} from "../../components/ui";
import {
  criarCheckoutAssinatura,
  obterMinhaAssinatura,
} from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const moeda = (v: unknown) =>
  Number(v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const data = (v: unknown) =>
  v
    ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "Não definida";
const status: Record<string, string> = {
  TESTE: "Em teste",
  ATIVA: "Ativa",
  INADIMPLENTE: "Pendente",
  SUSPENSA: "Suspensa",
};

export default function MinhaAssinatura() {
  const [painel, setPainel] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  async function carregar(refresh = false) {
    if (refresh) setAtualizando(true);
    else setCarregando(true);
    try {
      setPainel(await obterMinhaAssinatura());
    } catch (e: any) {
      Alert.alert(
        "Assinatura",
        e?.response?.data?.message ??
          "Não foi possível consultar sua assinatura.",
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }
  useEffect(() => {
    void carregar();
  }, []);
  async function pagar() {
    try {
      setAbrindo(true);
      const checkout = await criarCheckoutAssinatura(["CREDIT_CARD", "PIX"]);
      await Linking.openURL(checkout.url);
    } catch (e: any) {
      Alert.alert(
        "Pagamento recorrente",
        e?.response?.data?.message ??
          "Não foi possível abrir o ambiente seguro.",
      );
    } finally {
      setAbrindo(false);
    }
  }
  if (carregando) return <Loading />;
  const assinatura = painel?.assinatura;
  const plano = assinatura?.plano;
  const cobrancas = [...(assinatura?.cobrancas ?? [])].sort((a: any, b: any) =>
    String(b.vencimento).localeCompare(String(a.vencimento)),
  );
  return (
    <Screen>
      <AppHeader
        variant="subpage"
        title="Minha assinatura"
        subtitle="Plano e pagamentos"
        contextTitle="Licença Andrade Energy"
        contextSubtitle="Gestão da conta"
        icon="card-outline"
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void carregar(true)}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
      >
        {assinatura ? (
          <>
            <View style={styles.hero}>
              <Ionicons name="shield-checkmark" size={30} color="#F6CC32" />
              <View style={styles.grow}>
                <Text style={styles.eyebrow}>PLANO ATUAL</Text>
                <Text style={styles.title}>
                  {plano?.nome ?? "Andrade Energy"}
                </Text>
                <Text style={styles.heroText}>
                  {plano?.descricao ?? "Licença de uso da plataforma"}
                </Text>
              </View>
              <Text style={styles.badge}>
                {status[assinatura.status] ?? assinatura.status}
              </Text>
            </View>
            <View style={styles.grid}>
              <Info
                label="VALOR"
                value={moeda(assinatura.valor_contratado)}
                detail={assinatura.ciclo === "ANUAL" ? "por ano" : "por mês"}
              />
              <Info
                label="VALIDADE"
                value={data(assinatura.proximo_vencimento)}
                detail="próximo vencimento"
              />
              <Info
                label="FORMA ATUAL"
                value={String(assinatura.forma_pagamento ?? "Não definida")
                  .replace("CREDIT_CARD", "Cartão")
                  .replace("BOLETO", "Boleto")}
                detail={String(assinatura.ciclo).toLowerCase()}
              />
              <Info
                label="INÍCIO"
                value={data(assinatura.inicio_em)}
                detail="contratação"
              />
            </View>
            <TouchableOpacity
              disabled={abrindo}
              onPress={() => void pagar()}
              style={styles.payment}
            >
              <Ionicons name="card-outline" size={23} color="#FFF" />
              <View style={styles.grow}>
                <Text style={styles.paymentTitle}>
                  {abrindo
                    ? "Abrindo ambiente seguro..."
                    : "Ativar recorrência (opcional)"}
                </Text>
                <Text style={styles.paymentText}>
                  Escolha cartão ou Pix no checkout seguro. Se preferir,
                  continue pagando as cobranças avulsas.
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={abrindo}
              onPress={() => void pagar()}
              style={styles.renew}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={23}
                color={Colors.primary}
              />
              <View style={styles.grow}>
                <Text style={styles.renewTitle}>Antecipar renovação</Text>
                <Text style={styles.renewText}>
                  Abra o checkout e renove antes do próximo vencimento, com
                  confirmação antes da cobrança.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.section}>RECURSOS DO PLANO</Text>
            <View style={styles.card}>
              {(
                plano?.recursos ?? [
                  "Portal web",
                  "Aplicativo gerador",
                  "Gestão de usinas e clientes",
                ]
              ).map((item: string) => (
                <View key={item} style={styles.resource}>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={Colors.primary}
                  />
                  <Text style={styles.resourceText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.section}>HISTÓRICO DE COBRANÇAS</Text>
            <View style={styles.card}>
              {cobrancas.length ? (
                cobrancas.map((item: any) => (
                  <View key={item.id} style={styles.charge}>
                    <View>
                      <Text style={styles.chargeTitle}>
                        {item.competencia ?? "Mensalidade"}
                      </Text>
                      <Text style={styles.muted}>
                        Vence em {data(item.vencimento)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.chargeValue}>
                        {moeda(item.valor)}
                      </Text>
                      <Text style={styles.chargeStatus}>
                        {item.status === "PAGA"
                          ? "Paga"
                          : item.status === "VENCIDA"
                            ? "Vencida"
                            : "Pendente"}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>
                  Nenhuma cobrança registrada ainda.
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={42} color={Colors.primary} />
            <Text style={styles.emptyTitle}>
              Assinatura ainda não vinculada
            </Text>
            <Text style={styles.muted}>
              A administração precisa vincular um plano à sua conta.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
function Info({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#0B4A39",
    ...Shadows.card,
  },
  grow: { flex: 1 },
  eyebrow: {
    color: "#F6CC32",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    marginTop: 3,
    color: "#FFF",
    fontSize: Typography.title,
    fontWeight: "900",
  },
  heroText: {
    marginTop: 3,
    color: "rgba(255,255,255,.72)",
    fontSize: Typography.small,
  },
  badge: {
    maxWidth: 78,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.round,
    color: "#0B4A39",
    backgroundColor: "#F6CC32",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  info: {
    width: "48%",
    minHeight: 104,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#C7D9D0",
    borderRadius: Radius.md,
    backgroundColor: "#E8F1EC",
  },
  infoLabel: { color: Colors.primary, fontSize: 9, fontWeight: "900" },
  infoValue: {
    marginTop: 7,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  muted: {
    marginTop: 4,
    color: Colors.subtitle,
    fontSize: Typography.small,
    lineHeight: 18,
  },
  payment: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  paymentTitle: { color: "#FFF", fontWeight: "900" },
  paymentText: { marginTop: 2, color: "rgba(255,255,255,.75)", fontSize: 11 },
  renew: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: "#E8F1EC",
  },
  renewTitle: { color: Colors.primary, fontWeight: "900" },
  renewText: { marginTop: 2, color: Colors.subtitle, fontSize: 11 },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  card: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#C7D9D0",
    borderRadius: Radius.md,
    backgroundColor: "#F1F6F3",
  },
  resource: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 36,
  },
  resourceText: { color: Colors.text },
  charge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chargeTitle: { color: Colors.text, fontWeight: "800" },
  chargeValue: { color: Colors.text, fontWeight: "900", textAlign: "right" },
  chargeStatus: {
    marginTop: 3,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  empty: {
    alignItems: "center",
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: "#E8F1EC",
  },
  emptyTitle: {
    marginTop: Spacing.md,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "900",
    textAlign: "center",
  },
});
