import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CommercialTabs from "../../components/commercial/CommercialTabs";
import QuickAccessCarousel from "../../components/QuickAccessCarousel";
import {
  AppHeader,
  ElasticScrollView as ScrollView,
  Screen,
  Section,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  AppDownload,
  baixarAplicativo,
} from "../../services/app-download.service";
import {
  obterPainelComercial,
  PainelComercial,
} from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const moeda = (value: unknown) =>
  Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export default function HomeComercial() {
  const { usuario, logout } = useAuth();
  const [data, setData] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [baixandoApp, setBaixandoApp] = useState<AppDownload | null>(null);
  const [progressoApp, setProgressoApp] = useState(0);
  const baixarApp = async (tipo: AppDownload) => {
    if (baixandoApp) return;
    setBaixandoApp(tipo);
    setProgressoApp(0);
    try {
      await baixarAplicativo(tipo, setProgressoApp);
    } catch (error: any) {
      Alert.alert(
        "Download não concluído",
        error?.message ?? "Não foi possível baixar o aplicativo.",
      );
    } finally {
      setBaixandoApp(null);
      setProgressoApp(0);
    }
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await obterPainelComercial());
    } catch (error: any) {
      setData(null);
      if (error?.response?.status === 401) {
        await logout();
        Alert.alert(
          "Sessão encerrada",
          "Esta conta entrou em outro aparelho ou a sessão expirou. Entre novamente para ativar este dispositivo.",
        );
        router.replace("/(auth)/login" as any);
        return;
      }
      Alert.alert(
        "Não foi possível carregar a gestão comercial",
        error?.response?.data?.message ??
          "Verifique se o backend e a migração comercial estão atualizados.",
      );
    } finally {
      setLoading(false);
    }
  }, [logout]);
  useEffect(() => {
    void load();
  }, [load]);
  const colaboradorComercial = usuario?.papel_empresa === "COLABORADOR_COMERCIAL";
  if (usuario?.perfil !== "ADMIN" && !colaboradorComercial) {
    router.replace("/selecionar-unidade");
    return null;
  }
  const resumo = data?.resumo;
  const financeiro = data?.financeiro;
  return (
    <Screen edges={["top", "left", "right"]}>
      <AppHeader
        collapsePlantContextOnMount
        environmentName="Gestão comercial"
        icon="briefcase-outline"
        onSearch={() => router.push({ pathname: "/pesquisa", params: { perfil: "comercial" } } as any)}
        showPlantContext={false}
        title="Gestão comercial"
        subtitle="Painel administrativo"
        contextTitle={usuario?.nome ?? "Administração"}
        contextSubtitle="Geradores, assinaturas e empresas"
      />
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
              onPress={() => setMenuAberto(false)}
            />
            <DrawerLink
              icon="pulse-outline"
              label="Clientes ativos"
              onPress={() => {
                setMenuAberto(false);
                router.push("/geradores/monitoramento" as any);
              }}
            />
            <DrawerLink
              icon="business-outline"
              label="Geradores e assinaturas"
              onPress={() => {
                setMenuAberto(false);
                router.push("/geradores/gestao" as any);
              }}
            />
            {!colaboradorComercial ? <DrawerLink
              icon="cash-outline"
              label="Pagamentos e faturamento"
              onPress={() => {
                setMenuAberto(false);
                router.push({
                  pathname: "/geradores/gestao",
                  params: { aba: "PAGAMENTOS" },
                } as any);
              }}
            /> : null}
            {!colaboradorComercial ? <DrawerLink
              icon="layers-outline"
              label="Empresas parceiras"
              onPress={() => {
                setMenuAberto(false);
                router.push("/admin/empresas" as any);
              }}
            /> : null}
            {!colaboradorComercial ? <DrawerLink
              icon="person-add-outline"
              label="Convidar gerador"
              onPress={() => {
                setMenuAberto(false);
                router.push("/geradores/convidar");
              }}
            /> : null}
            <DrawerLink
              icon="download-outline"
              label="Compartilhar app do Gerador"
              onPress={() => {
                setMenuAberto(false);
                void baixarApp("gerador");
              }}
            />
            <DrawerLink
              icon="phone-portrait-outline"
              label="Compartilhar app do Consumidor"
              onPress={() => {
                setMenuAberto(false);
                void baixarApp("consumidor");
              }}
            />
            <DrawerLink
              icon="person-circle-outline"
              label="Perfil administrativo"
              onPress={() => {
                setMenuAberto(false);
                router.push({
                  pathname: "/admin/perfil",
                  params: { origem: "comercial" },
                } as any);
              }}
            />
            <DrawerLink icon="play-circle-outline" label="Tutoriais" onPress={() => { setMenuAberto(false); router.push("/tutoriais" as any); }} />
            <View style={styles.drawerDivider} />
            <DrawerLink
              danger
              icon="log-out-outline"
              label="Sair da conta"
              onPress={() => {
                setMenuAberto(false);
                void logout();
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
            onRefresh={load}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>ADMINISTRAÇÃO DO SOFTWARE</Text>
          <Text style={styles.title}>Painel comercial</Text>
          <Text style={styles.subtitle}>
            Acompanhe a comercialização e o acesso dos geradores.
          </Text>
        </View>
        <Section title="Acesso rápido" framed={false}>
          <QuickAccessCarousel
            storageKey="comercial-home"
            items={([
              { icon: "business-outline", label: "Geradores", value: `${data?.geradores.filter((item) => item.perfil === "GESTOR").length ?? 0} cadastrados`, onPress: () => router.push({ pathname: "/geradores/gestao", params: { aba: "GERADORES" } } as any) },
              { icon: "card-outline", label: "Assinaturas", value: `${data?.assinaturas.length ?? 0} cadastradas`, onPress: () => router.push({ pathname: "/geradores/gestao", params: { aba: "ASSINATURAS" } } as any) },
              { icon: "pulse-outline", label: "Clientes ativos", value: `${data?.resumo.ativas ?? 0} monitorados`, onPress: () => router.push("/geradores/monitoramento" as any) },
              { icon: "cash-outline", label: "Pagamentos", value: `${financeiro?.cobrancasPendentes ?? 0} pendentes`, badge: Boolean(financeiro?.cobrancasVencidas), onPress: () => router.push({ pathname: "/geradores/gestao", params: { aba: "PAGAMENTOS" } } as any) },
              { icon: "layers-outline", label: "Empresas parceiras", value: "Identidade e operação", onPress: () => router.push("/admin/empresas" as any) },
              { icon: "person-add-outline", label: "Convidar gerador", onPress: () => router.push("/geradores/convidar") },
              { icon: "people-circle-outline", label: "Colaboradores", value: "Convites e permissões", onPress: () => router.push("/colaboradores?ambiente=comercial" as any) },
              { icon: "document-text-outline", label: "Contratos e termos", value: `${data?.documentos.length ?? 0} documentos`, onPress: () => router.push("/geradores/gestao" as any) },
              { icon: "download-outline", label: "Compartilhar app Gerador", value: baixandoApp === "gerador" ? `Baixando ${progressoApp}%` : "WhatsApp, e-mail ou Bluetooth", onPress: () => void baixarApp("gerador") },
              { icon: "phone-portrait-outline", label: "Compartilhar app Consumidor", value: baixandoApp === "consumidor" ? `Baixando ${progressoApp}%` : "WhatsApp, e-mail ou Bluetooth", onPress: () => void baixarApp("consumidor") },
            ].filter((item) => !colaboradorComercial || ["Geradores", "Clientes ativos", "Contratos e termos"].includes(item.label))) as any}
          />
        </Section>
        {!colaboradorComercial && !loading && data ? (
          <View style={styles.financeGrid}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() =>
                router.push({
                  pathname: "/geradores/gestao",
                  params: { aba: "PAGAMENTOS" },
                } as any)
              }
              style={styles.revenueCard}
            >
              <View style={styles.financeTop}>
                <View>
                  <Text style={styles.financeEyebrow}>RECEITA MENSAL</Text>
                  <Text style={styles.financeValue}>
                    {moeda(resumo?.receitaMensalPrevista)}
                  </Text>
                </View>
                <View style={styles.financeIcon}>
                  <Ionicons name="trending-up" size={23} color="#F6CC32" />
                </View>
              </View>
              <View style={styles.financeFooter}>
                <Text style={styles.financeFooterText}>
                  Recebido {moeda(financeiro?.recebidoNoMes)}
                </Text>
                <Text style={styles.financeFooterText}>
                  Pendente {moeda(financeiro?.pendenteNoMes)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() =>
                router.push({
                  pathname: "/geradores/gestao",
                  params: { aba: "PAGAMENTOS" },
                } as any)
              }
              style={styles.walletCard}
            >
              <View style={styles.walletTop}>
                <View style={styles.walletIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={21}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.walletCopy}>
                  <Text style={styles.walletEyebrow}>CARTEIRA COMERCIAL</Text>
                  <Text style={styles.walletValue}>
                    {moeda(financeiro?.totalRecebido)}
                  </Text>
                  <Text style={styles.walletCaption}>
                    Total confirmado pelo Asaas
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={Colors.subtitle}
                />
              </View>
              <View style={styles.walletStatus}>
                <Text style={styles.pendingText}>
                  {financeiro?.cobrancasPendentes ?? 0} pendentes
                </Text>
                <Text style={styles.overdueText}>
                  {financeiro?.cobrancasVencidas ?? 0} vencidas
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
        {!colaboradorComercial ? (
          <TouchableOpacity activeOpacity={0.84} onPress={() => router.push("/colaboradores?ambiente=comercial" as any)} style={styles.teamCard}>
            <View style={styles.teamIcon}>
              <Ionicons name="people-circle-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.teamCopy}>
              <Text style={styles.teamTitle}>Equipe comercial</Text>
              <Text style={styles.teamText}>Crie logins próprios para colaboradores que administram geradores. Carteira, pagamentos, planos e ferramentas exclusivas do ADM continuam bloqueados.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
        {loading && !data ? (
          <ActivityIndicator color={Colors.primary} />
        ) : !colaboradorComercial ? (
          <View style={styles.metrics}>
            <Metric
              icon="people-outline"
              label="Assinaturas"
              value={String(resumo?.total ?? 0)}
              onPress={() =>
                router.push({
                  pathname: "/geradores/gestao",
                  params: { aba: "ASSINATURAS" },
                } as any)
              }
            />
            <Metric
              icon="checkmark-circle-outline"
              label="Ativas"
              value={String(resumo?.ativas ?? 0)}
              green
              onPress={() => router.push("/geradores/monitoramento" as any)}
            />
            <Metric
              icon="alert-circle-outline"
              label="Inadimplentes"
              value={String(resumo?.inadimplentes ?? 0)}
              danger
              onPress={() =>
                router.push({
                  pathname: "/geradores/gestao",
                  params: { aba: "PAGAMENTOS" },
                } as any)
              }
            />
          </View>
        ) : null}
        <Text style={styles.section}>RESUMO DA OPERAÇÃO COMERCIAL</Text>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {data?.geradores.length ?? 0}
            </Text>
            <Text style={styles.summaryLabel}>contas geradoras</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {data?.planos.filter((p) => p.ativo).length ?? 0}
            </Text>
            <Text style={styles.summaryLabel}>planos ativos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {data?.documentos.filter((d) => d.ativo).length ?? 0}
            </Text>
            <Text style={styles.summaryLabel}>documentos publicados</Text>
          </View>
        </View>
      </ScrollView>
      <CommercialTabs active="HOME" />
    </Screen>
  );
}
function Metric({ icon, label, value, green, danger, onPress }: any) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.metric}
    >
      <Ionicons
        name={icon}
        size={21}
        color={danger ? Colors.danger : green ? Colors.success : Colors.primary}
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={Colors.subtitle}
        style={styles.metricChevron}
      />
    </TouchableOpacity>
  );
}
function DrawerLink({ icon, label, onPress, danger = false }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.drawerLink}>
      <Ionicons
        name={icon}
        size={21}
        color={danger ? Colors.danger : Colors.primary}
      />
      <Text style={[styles.drawerLabel, danger && styles.drawerDanger]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={17} color={Colors.subtitle} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    backgroundColor: "#083D31",
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 2 },
  headerLabel: {
    color: "#86EFAC",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  headerUser: { marginTop: 3, color: "#FFF", fontSize: 13, fontWeight: "800" },
  profile: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  environmentSwitch: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    backgroundColor: "#0A503F",
  },
  environmentCurrent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  environmentLabel: { color: "#D8F0E3", fontSize: 12, fontWeight: "700" },
  environmentAction: {
    marginRight: 4,
    color: "#F6CC32",
    fontSize: 11,
    fontWeight: "900",
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
  drawerDanger: { color: Colors.danger },
  drawerDivider: { height: Spacing.md },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { marginBottom: Spacing.sm },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#C9DED1",
    borderRadius: Radius.xl,
    backgroundColor: "#F4FAF6",
    ...Shadows.card,
  },
  teamIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  teamCopy: { flex: 1, minWidth: 0 },
  teamTitle: { color: Colors.text, fontSize: Typography.caption, fontWeight: "900" },
  teamText: { marginTop: 3, color: Colors.subtitle, fontSize: 11, lineHeight: 16 },
  eyebrow: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 4,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "900",
  },
  subtitle: { marginTop: 4, color: Colors.subtitle, lineHeight: 19 },
  metrics: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  metric: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  metricChevron: { position: "absolute", top: 10, right: 9 },
  metricLabel: {
    marginTop: 6,
    color: Colors.subtitle,
    fontSize: 9,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  financeGrid: { gap: Spacing.sm },
  revenueCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#0A513E",
    ...Shadows.card,
  },
  financeTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  financeEyebrow: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  financeValue: {
    marginTop: 5,
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
  },
  financeIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  financeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.16)",
  },
  financeFooterText: { color: "#D1FAE5", fontSize: 11, fontWeight: "700" },
  walletCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#C7D9D0",
    borderRadius: Radius.xl,
    backgroundColor: "#E8F1EC",
  },
  walletTop: { flexDirection: "row", alignItems: "center" },
  walletIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    backgroundColor: "#D3E6DC",
  },
  walletCopy: { flex: 1, marginLeft: Spacing.sm },
  walletEyebrow: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  walletValue: {
    marginTop: 2,
    color: Colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  walletCaption: { marginTop: 1, color: Colors.subtitle, fontSize: 10 },
  walletStatus: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pendingText: { color: "#9A6700", fontSize: 11, fontWeight: "800" },
  overdueText: { color: Colors.danger, fontSize: 11, fontWeight: "800" },
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    padding: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "#176B55",
    backgroundColor: "#073F32",
    shadowColor: "#042D24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  summaryItem: {
    minHeight: 88,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  summaryValue: {
    color: "#F6CC32",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  summaryLabel: {
    maxWidth: 90,
    marginTop: 3,
    color: "#F2F8F5",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
});
