import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PortalBrandLogo from "../../components/brand/PortalBrandLogo";
import { ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  obterPainelComercial,
  PainelComercial,
} from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const DIA = 86_400_000;
const inicioDoDia = (valor: unknown) =>
  new Date(`${String(valor ?? "").slice(0, 10)}T12:00:00`).getTime();
const hoje = () => inicioDoDia(new Date().toISOString());
const diasEntre = (inicio: unknown, fim = hoje()) =>
  Math.max(0, Math.floor((fim - inicioDoDia(inicio)) / DIA));
const dataBr = (valor: unknown) =>
  valor
    ? new Date(`${String(valor).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "pt-BR",
      )
    : "Não definido";

export default function MonitoramentoGeradores() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [painel, setPainel] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setPainel(await obterPainelComercial());
    } catch (error: any) {
      Alert.alert(
        "Monitoramento",
        error?.response?.data?.message ??
          "Não foi possível carregar os clientes ativos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ativos = useMemo(
    () =>
      (painel?.assinaturas ?? [])
        .filter((item: any) =>
          ["TESTE", "ATIVA", "INADIMPLENTE", "SUSPENSA"].includes(
            String(item.status),
          ),
        )
        .filter((item: any) =>
          `${item.gerador?.nome ?? ""} ${item.gerador?.email ?? ""} ${item.plano?.nome ?? ""}`
            .toLowerCase()
            .includes(busca.trim().toLowerCase()),
        ),
    [busca, painel?.assinaturas],
  );

  if (user?.perfil !== "ADMIN")
    return (
      <Screen>
        <View style={styles.blocked}>
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={Colors.danger}
          />
          <Text style={styles.blockedTitle}>Acesso restrito</Text>
        </View>
      </Screen>
    );

  return (
    <Screen>
      <StatusBar backgroundColor="#082F26" barStyle="light-content" />
      <LinearGradient
        colors={["#082F26", "#0B4A39", "#0A5B43"]}
        style={[
          styles.header,
          { marginTop: -insets.top, paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            onPress={() => router.replace("/admin/comercial" as any)}
            style={styles.headerAction}
          >
            <Ionicons name="chevron-back" size={25} color="#FFF" />
          </TouchableOpacity>
          <PortalBrandLogo height={29} width={102} />
          <View style={styles.headerAction} />
        </View>
        <Text style={styles.headerEyebrow}>GESTÃO COMERCIAL</Text>
        <Text style={styles.headerTitle}>Clientes ativos</Text>
        <Text style={styles.headerSubtitle}>
          Acompanhe tempo de uso, período de teste e próximos vencimentos.
        </Text>
        <View style={styles.headerStats}>
          <View>
            <Text style={styles.headerValue}>{ativos.length}</Text>
            <Text style={styles.headerStatLabel}>monitorados</Text>
          </View>
          <View>
            <Text style={styles.headerValue}>
              {ativos.filter((item: any) => item.status === "TESTE").length}
            </Text>
            <Text style={styles.headerStatLabel}>em teste</Text>
          </View>
          <View>
            <Text style={styles.headerValue}>
              {
                ativos.filter((item: any) => item.status === "INADIMPLENTE")
                  .length
              }
            </Text>
            <Text style={styles.headerStatLabel}>pendentes</Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={carregar}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={Colors.subtitle} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setBusca}
            placeholder="Buscar por nome, e-mail ou plano"
            placeholderTextColor={Colors.subtitle}
            style={styles.searchInput}
            value={busca}
          />
        </View>
        {loading && !painel ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          ativos.map((item: any) => (
            <ClienteCard key={item.id} assinatura={item} />
          ))
        )}
        {!loading && !ativos.length ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={34} color={Colors.primary} />
            <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
            <Text style={styles.emptyText}>
              Não há assinaturas ativas correspondentes à busca.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ClienteCard({ assinatura }: any) {
  const decorridos = diasEntre(assinatura.inicio_em);
  const testeTotal = assinatura.fim_teste_em
    ? Math.max(
        1,
        diasEntre(assinatura.inicio_em, inicioDoDia(assinatura.fim_teste_em)),
      )
    : 45;
  const testeDecorrido = Math.min(testeTotal, decorridos);
  const restantes =
    assinatura.status === "TESTE"
      ? Math.max(0, testeTotal - testeDecorrido)
      : null;
  const progresso =
    assinatura.status === "TESTE"
      ? Math.min(100, (testeDecorrido / testeTotal) * 100)
      : 100;
  const tone =
    assinatura.status === "INADIMPLENTE"
      ? styles.badgeDanger
      : assinatura.status === "TESTE"
        ? styles.badgeTrial
        : styles.badgeActive;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {String(assinatura.gerador?.nome ?? "G")
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.name}>
            {assinatura.gerador?.nome ?? "Gerador"}
          </Text>
          <Text numberOfLines={1} style={styles.email}>
            {assinatura.gerador?.email ?? "E-mail não informado"}
          </Text>
        </View>
        <Text style={[styles.badge, tone]}>{assinatura.status}</Text>
      </View>
      <View style={styles.daysRow}>
        <View>
          <Text style={styles.daysValue}>{decorridos}</Text>
          <Text style={styles.daysLabel}>dias decorridos</Text>
        </View>
        <View style={styles.daysRight}>
          <Text style={styles.plan}>{assinatura.plano?.nome ?? "Plano"}</Text>
          <Text style={styles.cycle}>
            {String(assinatura.ciclo ?? "").toLowerCase()} · desde{" "}
            {dataBr(assinatura.inicio_em)}
          </Text>
        </View>
      </View>
      {assinatura.status === "TESTE" ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progress, { width: `${progresso}%` }]} />
          </View>
          <View style={styles.progressLegend}>
            <Text>
              {testeDecorrido} de {testeTotal} dias usados
            </Text>
            <Text style={styles.remaining}>{restantes} dias restantes</Text>
          </View>
        </>
      ) : null}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>PRÓXIMO VENCIMENTO</Text>
          <Text style={styles.footerValue}>
            {dataBr(assinatura.proximo_vencimento)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/geradores/gestao",
              params: { aba: "ASSINATURAS" },
            } as any)
          }
          style={styles.manage}
        >
          <Text style={styles.manageText}>Gerenciar</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.09)",
  },
  headerEyebrow: {
    marginTop: Spacing.sm,
    color: "#A7F3D0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerTitle: { marginTop: 3, color: "#FFF", fontSize: 21, fontWeight: "900" },
  headerSubtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,.76)",
    fontSize: 12,
    lineHeight: 17,
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.14)",
  },
  headerValue: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  headerStatLabel: {
    marginTop: 1,
    color: "#CDEBDE",
    fontSize: 10,
    textAlign: "center",
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  search: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, color: Colors.text },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#C7D9D0",
    borderRadius: Radius.xl,
    backgroundColor: "#F1F6F3",
    ...Shadows.card,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  cardCopy: { flex: 1, minWidth: 0, marginLeft: Spacing.sm },
  name: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  email: { marginTop: 2, color: Colors.subtitle, fontSize: 11 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.round,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
  },
  badgeActive: { color: Colors.primary, backgroundColor: "#DDF4E7" },
  badgeTrial: { color: "#8A5A00", backgroundColor: "#FFF0C2" },
  badgeDanger: { color: Colors.danger, backgroundColor: "#FEE2E2" },
  daysRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  daysValue: { color: Colors.text, fontSize: 29, fontWeight: "900" },
  daysLabel: { color: Colors.subtitle, fontSize: 10 },
  daysRight: { alignItems: "flex-end" },
  plan: { color: Colors.primary, fontSize: 13, fontWeight: "900" },
  cycle: { marginTop: 2, color: Colors.subtitle, fontSize: 10 },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    marginTop: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: "#D6E5DD",
  },
  progress: {
    height: "100%",
    borderRadius: Radius.round,
    backgroundColor: "#E9A800",
  },
  progressLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  remaining: { color: Colors.primary, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  footerLabel: {
    color: Colors.subtitle,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  footerValue: {
    marginTop: 2,
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  manage: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  manageText: { color: Colors.primary, fontSize: 11, fontWeight: "900" },
  empty: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: "#E8F1EC",
  },
  emptyTitle: {
    marginTop: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  emptyText: { marginTop: 3, color: Colors.subtitle, textAlign: "center" },
  blocked: { flex: 1, alignItems: "center", justifyContent: "center" },
  blockedTitle: {
    marginTop: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "900",
  },
});
