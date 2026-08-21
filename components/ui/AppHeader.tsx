import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, Image, Modal, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { listarFaturas } from "../../services/faturas.service";
import { buscarDashboardUsina } from "../../services/usinas.service";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Props = {
  title: string;
  subtitle: string;
  contextTitle: string;
  contextSubtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AppHeader({
  title,
  subtitle,
  contextTitle,
  contextSubtitle,
  icon = "grid-outline",
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, usuario, usinaSelecionada } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [notificacoesLidas, setNotificacoesLidas] = useState<string[]>([]);
  const [autonomia, setAutonomia] = useState<{ percentual: number; disponivel: number } | null>(null);
  const proprietario = IS_GERADOR_APP;
  const chaveNotificacoesLidas = `andrade_energy_notificacoes_lidas_${usuario?.id ?? "anon"}`;

  useEffect(() => {
    let ativo = true;
    Promise.all([listarFaturas(), AsyncStorage.getItem(chaveNotificacoesLidas)]).then(([faturas, salvas]) => {
      if (!ativo) return;
      const lidas = salvas ? JSON.parse(salvas) : [];
      const idsLidos = Array.isArray(lidas) ? lidas : [];
      setNotificacoesLidas(idsLidos);
      const hoje = new Date();
      const avisos = (faturas ?? []).flatMap((fatura: any) => {
        const status = String(fatura.cobrancas?.[0]?.status ?? fatura.status ?? "").toUpperCase();
        if (["PAGA", "PAGO", "QUITADA"].includes(status)) return [];
        const vencimento = fatura.vencimento ? new Date(`${fatura.vencimento}T23:59:59`) : null;
        if (!vencimento) return [];
        const dias = Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);
        if (dias < 0) return [{ id: `vencida-${fatura.id}`, severidade: "alta", titulo: "Fatura vencida", detalhe: `${fatura.clientes?.nome ?? "Cliente"} · ${fatura.referencia ?? "Competência não informada"}`, rota: proprietario ? "/faturas" : `/faturas/${fatura.id}` }];
        if (dias <= 5) return [{ id: `vence-${fatura.id}`, severidade: "media", titulo: "Fatura próxima do vencimento", detalhe: `${fatura.clientes?.nome ?? "Cliente"} · vence em ${dias} dia${dias === 1 ? "" : "s"}`, rota: `/faturas/${fatura.id}` }];
        return [];
      }).sort((a: any, b: any) => (a.severidade === "alta" ? -1 : 1) - (b.severidade === "alta" ? -1 : 1));
      setNotificacoes(avisos.filter((aviso: any) => !idsLidos.includes(aviso.id)));
    }).catch(() => { if (ativo) setNotificacoes([]); });
    return () => { ativo = false; };
  }, [chaveNotificacoesLidas, proprietario, usinaSelecionada?.id]);

  async function marcarNotificacaoComoLida(id: string) {
    const atualizadas = Array.from(new Set([...notificacoesLidas, id]));
    setNotificacoesLidas(atualizadas);
    setNotificacoes((lista) => lista.filter((aviso) => aviso.id !== id));
    await AsyncStorage.setItem(chaveNotificacoesLidas, JSON.stringify(atualizadas));
  }

  useEffect(() => {
    if (!proprietario || !usinaSelecionada?.id) { setAutonomia(null); return; }
    let ativo = true;
    buscarDashboardUsina(usinaSelecionada.id).then((dados) => {
      if (!ativo) return;
      const gerada = Number(dados?.energiaGerada ?? 0);
      const disponivel = Number(dados?.energiaDisponivel ?? 0);
      setAutonomia({ percentual: gerada > 0 ? Math.max(0, Math.min(100, disponivel / gerada * 100)) : 0, disponivel });
    }).catch(() => { if (ativo) setAutonomia(null); });
    return () => { ativo = false; };
  }, [proprietario, usinaSelecionada?.id]);

  function navegar(rota: string) {
    setMenuAberto(false);
    router.push(rota as any);
  }

  function confirmarSaida() {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <LinearGradient colors={["#006B3C", "#008C4A", "#38A94B"]} end={{ x: 1, y: 0.85 }} start={{ x: 0, y: 0 }} style={[styles.container, { marginTop: -insets.top, paddingTop: insets.top + Spacing.md }]}>
      <StatusBar backgroundColor="#006B3C" barStyle="light-content" />
      <View style={styles.top}>
        <TouchableOpacity
          accessibilityLabel="Abrir menu"
          activeOpacity={0.8}
          onPress={() => setMenuAberto(true)}
          style={styles.action}
        >
          <Ionicons name="menu-outline" size={30} color={Colors.surface} />
        </TouchableOpacity>

        <TouchableOpacity accessibilityLabel="Abrir perfil" activeOpacity={0.8} onPress={() => router.push("/perfil")} style={styles.profileButton}>
          <View style={styles.avatar}><Ionicons name="person" size={21} color={Colors.surface} /></View>
          <View style={styles.titleContent}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity accessibilityLabel={notificacoes.length ? `${notificacoes.length} notificações` : "Notificações"} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.8} onPress={() => setNotificacoesAbertas(true)} style={styles.action}>
          <Ionicons name={notificacoes.length ? "notifications" : "notifications-outline"} size={24} color={Colors.surface} />
          {notificacoes.length ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notificacoes.length > 9 ? "9+" : notificacoes.length}</Text></View> : null}
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={notificacoesAbertas} onRequestClose={() => setNotificacoesAbertas(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNotificacoesAbertas(false)}>
          <Pressable style={styles.notificationPanel} onPress={(evento) => evento.stopPropagation()}>
            <View style={styles.menuHeader}><Text style={styles.menuTitle}>Notificações</Text><TouchableOpacity onPress={() => setNotificacoesAbertas(false)}><Ionicons name="close" size={26} color={Colors.text} /></TouchableOpacity></View>
            {notificacoes.length ? notificacoes.map((aviso) => <TouchableOpacity key={aviso.id} onPress={async () => { await marcarNotificacaoComoLida(aviso.id); setNotificacoesAbertas(false); router.push(aviso.rota as any); }} style={styles.notificationItem}><View style={[styles.notificationDot, aviso.severidade === "alta" && styles.notificationDotHigh]} /><View style={styles.notificationCopy}><Text style={styles.notificationTitle}>{aviso.titulo}</Text><Text style={styles.notificationDetail}>{aviso.detalhe}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></TouchableOpacity>) : <View style={styles.emptyNotifications}><Ionicons name="checkmark-circle-outline" size={34} color={Colors.success} /><Text style={styles.emptyNotificationsTitle}>Tudo em dia</Text><Text style={styles.emptyNotificationsText}>Nenhuma pendência importante encontrada.</Text></View>}
          </Pressable>
        </Pressable>
      </Modal>

      {proprietario && usinaSelecionada ? <View style={styles.plantBar}>
        <View style={styles.plantLogo}>
          <Image source={require("../../assets/images/andrade-logo-horizontal.png")} style={styles.plantLogoImage} resizeMode="contain" />
        </View>
        <View style={styles.plantText}><Text numberOfLines={1} style={styles.plantName}>{usinaSelecionada.nome}</Text><Text numberOfLines={1} style={styles.plantAutonomy}>{autonomia ? `Autonomia ${autonomia.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${autonomia.disponivel.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh disponíveis` : "Calculando autonomia..."}</Text></View>
      </View> : null}

      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Image source={require("../../assets/images/andrade-logo-horizontal.png")} style={styles.contextLogo} resizeMode="contain" />
        </View>

        <View style={styles.contextContent}>
          <Text numberOfLines={1} style={styles.contextTitle}>
            {contextTitle}
          </Text>

          <Text numberOfLines={1} style={styles.contextSubtitle}>
            {contextSubtitle}
          </Text>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={menuAberto} onRequestClose={() => setMenuAberto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuAberto(false)}>
          <Pressable style={styles.menu} onPress={(evento) => evento.stopPropagation()}>
            <View style={styles.menuHeader}><Text style={styles.menuTitle}>Menu</Text><TouchableOpacity onPress={() => setMenuAberto(false)}><Ionicons name="close" size={26} color={Colors.text} /></TouchableOpacity></View>
            <MenuLink icon="home-outline" label="Início" onPress={() => navegar("/")} />
            {proprietario ? <><MenuLink icon="people-outline" label="Clientes" onPress={() => navegar("/clientes")} /><MenuLink icon="business-outline" label="Usinas" onPress={() => navegar("/usinas")} /><MenuLink icon="flash-outline" label="Unidades consumidoras" onPress={() => navegar("/unidades")} /><MenuLink icon="document-text-outline" label="Contratos dos clientes" onPress={() => navegar("/contratos")} /><MenuLink icon="wallet-outline" label="Financeiro" onPress={() => navegar("/financeiro")} /></> : <><MenuLink icon="receipt-outline" label="Minhas faturas" onPress={() => navegar("/faturas")} /><MenuLink icon="document-text-outline" label="Meu contrato" onPress={() => navegar("/contrato")} /></>}
            <MenuLink icon="person-outline" label="Perfil" onPress={() => navegar("/perfil")} />
            <View style={styles.menuDivider} /><MenuLink icon="log-out-outline" label="Sair da conta" danger onPress={confirmarSaida} />
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function MenuLink({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <TouchableOpacity onPress={onPress} style={styles.menuLink}><Ionicons name={icon} size={22} color={danger ? Colors.danger : Colors.primary} /><Text style={[styles.menuLabel, danger && styles.menuDanger]}>{label}</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
  },

  titleContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },

  title: {
    color: Colors.surface,
    fontSize: Typography.body,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 2,
    color: Colors.surface,
    fontSize: Typography.caption,
  },

  action: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: { position: "absolute", top: 2, right: 0, minWidth: 17, height: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderRadius: Radius.round, backgroundColor: "#DC2626" },
  notificationBadgeText: { color: Colors.surface, fontSize: 10, fontWeight: "800" },
  plantBar: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, padding: Spacing.xs, borderRadius: Radius.md, backgroundColor: "rgba(255,255,255,0.12)" },
  plantLogo: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  plantLogoImage: { width: 34, height: 29 },
  plantText: { flex: 1 },
  plantName: { color: Colors.surface, fontSize: Typography.small, fontWeight: "800" },
  plantAutonomy: { marginTop: 1, color: "rgba(255,255,255,0.78)", fontSize: 11 },
  backdrop: { flex: 1, alignItems: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  menu: { width: "84%", height: "100%", paddingHorizontal: Spacing.lg, paddingTop: 58, backgroundColor: Colors.surface },
  notificationPanel: { width: "88%", marginTop: 90, marginHorizontal: "6%", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.surface },
  notificationItem: { minHeight: 66, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.border },
  notificationDot: { width: 10, height: 10, marginRight: Spacing.sm, borderRadius: Radius.round, backgroundColor: Colors.secondary },
  notificationDotHigh: { backgroundColor: Colors.danger },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  notificationDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  emptyNotifications: { alignItems: "center", paddingVertical: Spacing.xl },
  emptyNotificationsTitle: { marginTop: Spacing.sm, color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  emptyNotificationsText: { marginTop: 4, color: Colors.subtitle, textAlign: "center" },
  menuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  menuTitle: { color: Colors.text, fontSize: Typography.title, fontWeight: "800" },
  menuLink: { minHeight: 54, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { flex: 1, marginLeft: Spacing.md, color: Colors.text, fontSize: Typography.body, fontWeight: "600" },
  menuDanger: { color: Colors.danger }, menuDivider: { height: Spacing.md },

  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    padding: Spacing.md,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },

  contextIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
  },
  contextLogo: { width: 38, height: 32 },

  contextContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },

  contextTitle: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },

  contextSubtitle: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
});
