import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
import CommercialTabs from "../../components/commercial/CommercialTabs";
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
  const [menuAberto, setMenuAberto] = useState(false);
  const [selecionada, setSelecionada] = useState<any>(null);

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
        .map((item: any) => ({
          ...item,
          gerador: {
            ...item.gerador,
            ...(painel?.geradores ?? []).find(
              (gerador: any) => gerador.id === item.gerador_id,
            ),
          },
        }))
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
    [busca, painel?.assinaturas, painel?.geradores],
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
            accessibilityLabel="Abrir menu"
            onPress={() => setMenuAberto(true)}
            style={styles.headerAction}
          >
            <Ionicons name="menu-outline" size={27} color="#FFF" />
          </TouchableOpacity>
          <PortalBrandLogo height={30} width={104} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>GESTÃO COMERCIAL</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              Clientes ativos
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Abrir perfil"
            onPress={() =>
              router.push({
                pathname: "/admin/perfil",
                params: { origem: "comercial" },
              } as any)
            }
            style={styles.headerAction}
          >
            <Ionicons name="person-outline" size={21} color="#FFF" />
          </TouchableOpacity>
        </View>
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
      <Modal
        animationType="fade"
        transparent
        visible={menuAberto}
        onRequestClose={() => setMenuAberto(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuAberto(false)}>
          <Pressable
            style={styles.drawer}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Gestão comercial</Text>
              <TouchableOpacity onPress={() => setMenuAberto(false)}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <DrawerLink
              icon="home-outline"
              label="Painel comercial"
              onPress={() => {
                setMenuAberto(false);
                router.replace("/admin/comercial" as any);
              }}
            />
            <DrawerLink
              icon="wallet-outline"
              label="Carteira"
              onPress={() => {
                setMenuAberto(false);
                router.replace({
                  pathname: "/geradores/gestao",
                  params: { aba: "ASSINATURAS" },
                } as any);
              }}
            />
            <DrawerLink
              icon="cash-outline"
              label="Receita mensal"
              onPress={() => {
                setMenuAberto(false);
                router.replace({
                  pathname: "/geradores/gestao",
                  params: { aba: "PAGAMENTOS" },
                } as any);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
            <ClienteCard
              key={item.id}
              assinatura={item}
              onPress={() => setSelecionada(item)}
            />
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
      <CommercialTabs />
      <DetalhesCliente
        assinatura={selecionada}
        onClose={() => setSelecionada(null)}
      />
    </Screen>
  );
}

function ClienteCard({ assinatura, onPress }: any) {
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
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={styles.card}
    >
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
        <View style={styles.manage}>
          <Text style={styles.manageText}>Ver detalhes</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DetalhesCliente({ assinatura, onClose }: any) {
  if (!assinatura) return null;
  const gerador = assinatura.gerador ?? {};
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <Pressable style={styles.detailBackdrop} onPress={onClose}>
        <Pressable
          style={styles.detailSheet}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.detailHandle} />
          <View style={styles.detailHeading}>
            <View style={styles.detailAvatar}>
              <Text style={styles.avatarText}>
                {String(gerador.nome ?? "G")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.detailTitle}>
                {gerador.nome ?? "Gerador"}
              </Text>
              <Text style={styles.email}>
                {gerador.email ?? "E-mail não informado"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={Colors.subtitle} />
            </TouchableOpacity>
          </View>
          <View style={styles.detailGrid}>
            <DetailMetric
              icon="business-outline"
              label="Usinas cadastradas"
              value={String(gerador.total_usinas ?? 0)}
            />
            <DetailMetric
              icon="flash-outline"
              label="UCs ativas"
              value={String(gerador.total_ucs_ativas ?? 0)}
            />
            <DetailMetric
              icon="card-outline"
              label="Plano"
              value={assinatura.plano?.nome ?? "—"}
            />
            <DetailMetric
              icon="calendar-outline"
              label="Vencimento"
              value={dataBr(assinatura.proximo_vencimento)}
            />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.footerLabel}>STATUS DA ASSINATURA</Text>
            <Text style={styles.detailStatus}>{assinatura.status}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.footerLabel}>INÍCIO DO ACESSO</Text>
            <Text style={styles.footerValue}>
              {dataBr(assinatura.inicio_em)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push({
                pathname: "/geradores/gestao",
                params: { aba: "ASSINATURAS" },
              } as any);
            }}
            style={styles.detailButton}
          >
            <Text style={styles.detailButtonText}>Gerenciar assinatura</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailMetric({ icon, label, value }: any) {
  return (
    <View style={styles.detailMetric}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.detailMetricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailMetricValue}>
        {value}
      </Text>
    </View>
  );
}

function DrawerLink({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.drawerLink}>
      <Ionicons name={icon} size={21} color={Colors.primary} />
      <Text style={styles.drawerLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={Colors.subtitle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  headerTop: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    color: "#A7F3D0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 2 },
  headerTitle: { marginTop: 3, color: "#FFF", fontSize: 13, fontWeight: "800" },
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
  backdrop: {
    flex: 1,
    alignItems: "flex-start",
    backgroundColor: "rgba(15,23,42,.45)",
  },
  drawer: {
    width: "84%",
    height: "100%",
    paddingHorizontal: Spacing.lg,
    paddingTop: 58,
    backgroundColor: Colors.surface,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  drawerTitle: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "900",
  },
  drawerLink: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerLabel: {
    flex: 1,
    marginLeft: Spacing.md,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
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
  detailBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,.5)",
  },
  detailSheet: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.surface,
  },
  detailHandle: {
    width: 46,
    height: 5,
    alignSelf: "center",
    marginBottom: Spacing.lg,
    borderRadius: Radius.round,
    backgroundColor: Colors.border,
  },
  detailHeading: { flexDirection: "row", alignItems: "center" },
  detailAvatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  detailTitle: { color: Colors.text, fontSize: 17, fontWeight: "900" },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  detailMetric: {
    width: "48%",
    minHeight: 100,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "#E8F1EC",
  },
  detailMetricLabel: {
    marginTop: 7,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
  },
  detailMetricValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailStatus: { color: Colors.primary, fontSize: 12, fontWeight: "900" },
  detailButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  detailButtonText: { color: "#FFF", fontSize: 13, fontWeight: "900" },
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
