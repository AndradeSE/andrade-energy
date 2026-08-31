import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, Image, Modal, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { useReadNotifications } from "../../hooks/useReadNotifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { listarFaturas } from "../../services/faturas.service";
import { buscarDashboardUsina } from "../../services/usinas.service";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import PortalBrandLogo from "../brand/PortalBrandLogo";
import { useEmpresa } from "../../contexts/EmpresaContext";
import { notificarAvisosNoAndroid } from "../../services/carteira-notificacoes.service";

function escurecerCor(hex: string, fator = 0.62) {
  const limpa = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(limpa)) return "#082F26";
  const canais = [0, 2, 4].map((inicio) => Math.round(parseInt(limpa.slice(inicio, inicio + 2), 16) * fator));
  return `#${canais.map((canal) => canal.toString(16).padStart(2, "0")).join("")}`;
}

type Props = {
  title: string;
  subtitle: string;
  contextTitle: string;
  contextSubtitle: string;
  contextBadge?: string;
  contextBadgeTone?: "success" | "danger" | "neutral";
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "main" | "subpage";
  showPlantContext?: boolean;
  environmentName?: string;
  onSearch?: () => void;
};

export default function AppHeader({
  title,
  subtitle,
  contextTitle,
  contextSubtitle,
  contextBadge,
  contextBadgeTone = "neutral",
  icon = "grid-outline",
  variant = "main",
  showPlantContext = true,
  environmentName = "Gestão de usinas",
  onSearch,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, usuario, usinaSelecionada } = useAuth();
  const { empresa } = useEmpresa();
  const corPrincipal = empresa.cor_primaria || Colors.primary;
  const corEscura = escurecerCor(corPrincipal);
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [avisosRecebidos, setNotificacoes] = useState<any[]>([]);
  const usuarioId = usuario?.id ? String(usuario.id) : undefined;
  const leituras = useReadNotifications(usuarioId);
  const notificacoes = leituras.ready ? avisosRecebidos.filter((aviso) => !leituras.ids.includes(String(aviso.id))) : [];
  const [autonomia, setAutonomia] = useState<{ percentual: number; disponivel: number } | null>(null);
  const proprietario = IS_GERADOR_APP;
  const podeAlternarPerfil = IS_GERADOR_APP && usuario?.perfil === "ADMIN";

  useEffect(() => {
    let ativo = true;
    setNotificacoes([]);
    if (!usuario?.id) return;
    listarFaturas().then((faturas) => {
      if (!ativo) return;
      const hoje = new Date();
      const avisos = (faturas ?? []).flatMap((fatura: any) => {
        const status = String(fatura.cobrancas?.[0]?.status ?? fatura.status ?? "").toUpperCase();
        if (["PAGA", "PAGO", "QUITADA"].includes(status)) return [];
        const vencimento = fatura.vencimento ? new Date(`${fatura.vencimento}T23:59:59`) : null;
        if (!vencimento) return [];
        const dias = Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);
        // O ID é sempre o da fatura, tanto no cabeçalho do gestor quanto no
        // do consumidor. Assim a mesma leitura não reaparece em outra tela.
        if (dias < 0) return [{ id: String(fatura.id), severidade: "alta", titulo: "Fatura vencida", detalhe: `${fatura.clientes?.nome ?? "Cliente"} · ${fatura.referencia ?? "Competência não informada"}`, rota: proprietario ? "/faturas" : `/faturas/${fatura.id}` }];
        if (dias <= 5) return [{ id: String(fatura.id), severidade: "media", titulo: "Fatura próxima do vencimento", detalhe: `${fatura.clientes?.nome ?? "Cliente"} · vence em ${dias} dia${dias === 1 ? "" : "s"}`, rota: `/faturas/${fatura.id}` }];
        return [];
      }).sort((a: any, b: any) => (a.severidade === "alta" ? -1 : 1) - (b.severidade === "alta" ? -1 : 1));
      setNotificacoes(avisos);
      void notificarAvisosNoAndroid(usuarioId, avisos.map((aviso: any) => ({
        id: aviso.id,
        titulo: aviso.titulo,
        detalhe: aviso.detalhe,
        rota: aviso.rota,
        urgente: aviso.severidade === "alta",
      })));
    }).catch(() => { if (ativo) setNotificacoes([]); });
    return () => { ativo = false; };
  }, [usuarioId, proprietario, usinaSelecionada?.id]);

  async function marcarNotificacaoComoLida(id: string) {
    try { await leituras.mark(id); }
    catch { Alert.alert("Leitura não salva", "Não foi possível salvar a leitura desta notificação. Tente novamente."); }
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

  if (variant === "subpage") {
    return (
      <LinearGradient colors={[corEscura, corPrincipal]} end={{ x: 1, y: 0.8 }} start={{ x: 0, y: 0 }} style={[styles.subpageHeader, { marginTop: -insets.top, paddingTop: insets.top + 8 }]}>
        <StatusBar backgroundColor={corEscura} barStyle="light-content" />
        <TouchableOpacity accessibilityLabel="Voltar" activeOpacity={0.75} onPress={() => router.back()} style={styles.subpageBack}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={[styles.subpageIcon, { backgroundColor: "rgba(255,255,255,.14)" }]}>
          <Ionicons name={icon} size={20} color={empresa.cor_secundaria || "#F7D75C"} />
        </View>
        <View style={styles.subpageCopy}>
          <Text numberOfLines={1} style={styles.subpageTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.subpageSubtitle}>{subtitle}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[corEscura, corPrincipal, corPrincipal]} end={{ x: 1, y: 0.85 }} start={{ x: 0, y: 0 }} style={[styles.container, { marginTop: -insets.top, paddingTop: insets.top + Spacing.md }]}>
      <StatusBar backgroundColor={corEscura} barStyle="light-content" />
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
          <View style={[styles.avatar, { backgroundColor: corPrincipal }]}><Ionicons name={icon} size={21} color={Colors.surface} /></View>
          <View style={styles.titleContent}>
            <Text numberOfLines={1} style={styles.sectionLabel}>{title} · {subtitle}</Text>
            <View style={styles.contextTitleRow}>
              <Text numberOfLines={1} style={styles.title}>{contextTitle}</Text>
              {contextBadge ? <View style={[styles.contextBadge, contextBadgeTone === "success" && styles.contextBadgeSuccess, contextBadgeTone === "danger" && styles.contextBadgeDanger]}>
                <Text numberOfLines={1} style={[styles.contextBadgeText, contextBadgeTone === "success" && styles.contextBadgeTextSuccess, contextBadgeTone === "danger" && styles.contextBadgeTextDanger]}>{contextBadge}</Text>
              </View> : null}
            </View>
            <Text numberOfLines={1} style={styles.subtitle}>{contextSubtitle}</Text>
          </View>
        </TouchableOpacity>

        {onSearch ? <TouchableOpacity accessibilityLabel="Pesquisar" hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} activeOpacity={0.8} onPress={onSearch} style={styles.action}>
          <Ionicons name="search-outline" size={24} color={Colors.surface} />
        </TouchableOpacity> : null}
        <TouchableOpacity accessibilityLabel={notificacoes.length ? `${notificacoes.length} notificações` : "Notificações"} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.8} onPress={() => setNotificacoesAbertas(true)} style={styles.action}>
          <Ionicons name={notificacoes.length ? "notifications" : "notifications-outline"} size={24} color={Colors.surface} />
          {notificacoes.length ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notificacoes.length > 9 ? "9+" : notificacoes.length}</Text></View> : null}
        </TouchableOpacity>
      </View>

      {podeAlternarPerfil ? <TouchableOpacity accessibilityLabel="Trocar ambiente de gestão" activeOpacity={0.82} onPress={() => router.replace("/admin/escolher-area" as any)} style={styles.environmentSwitch}>
        <View style={styles.environmentCurrent}><Ionicons name={environmentName === "Gestão comercial" ? "briefcase-outline" : "sunny-outline"} size={14} color="#A7F3D0" /><Text style={styles.environmentLabel}>{environmentName}</Text></View>
        <Text style={styles.environmentAction}>Trocar ambiente</Text><Ionicons name="chevron-forward" size={14} color="#F6CC32" />
      </TouchableOpacity> : null}

      <Modal animationType="fade" transparent visible={notificacoesAbertas} onRequestClose={() => setNotificacoesAbertas(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNotificacoesAbertas(false)}>
          <Pressable style={styles.notificationPanel} onPress={(evento) => evento.stopPropagation()}>
            <View style={styles.menuHeader}><Text style={styles.menuTitle}>Notificações</Text><TouchableOpacity onPress={() => setNotificacoesAbertas(false)}><Ionicons name="close" size={26} color={Colors.text} /></TouchableOpacity></View>
            {notificacoes.length ? notificacoes.map((aviso) => <TouchableOpacity key={aviso.id} onPress={async () => { await marcarNotificacaoComoLida(aviso.id); setNotificacoesAbertas(false); router.push(aviso.rota as any); }} style={styles.notificationItem}><View style={[styles.notificationDot, aviso.severidade === "alta" && styles.notificationDotHigh]} /><View style={styles.notificationCopy}><Text style={styles.notificationTitle}>{aviso.titulo}</Text><Text style={styles.notificationDetail}>{aviso.detalhe}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></TouchableOpacity>) : <View style={styles.emptyNotifications}><Ionicons name="checkmark-circle-outline" size={34} color={Colors.success} /><Text style={styles.emptyNotificationsTitle}>Tudo em dia</Text><Text style={styles.emptyNotificationsText}>Nenhuma pendência importante encontrada.</Text></View>}
          </Pressable>
        </Pressable>
      </Modal>

      {showPlantContext && proprietario && usinaSelecionada ? <View style={styles.plantBar}>
        <View style={styles.plantLogo}>
          {empresa.identidade_personalizada && empresa.logo_url
            ? <Image resizeMode="contain" source={{ uri: empresa.logo_url }} style={styles.companyLogo} />
            : <PortalBrandLogo height={30} width={90} />}
        </View>
        <View style={styles.plantText}><Text numberOfLines={1} style={styles.plantName}>{usinaSelecionada.nome}</Text><Text numberOfLines={1} style={styles.plantAutonomy}>{autonomia ? `Autonomia ${autonomia.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${autonomia.disponivel.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh disponíveis` : "Calculando autonomia..."}</Text></View>
      </View> : null}

      <Modal animationType="fade" transparent visible={menuAberto} onRequestClose={() => setMenuAberto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuAberto(false)}>
          <Pressable style={styles.menu} onPress={(evento) => evento.stopPropagation()}>
            <View style={styles.menuHeader}><Text style={styles.menuTitle}>Menu</Text><TouchableOpacity onPress={() => setMenuAberto(false)}><Ionicons name="close" size={26} color={Colors.text} /></TouchableOpacity></View>
            <MenuLink icon="home-outline" label="Início" onPress={() => navegar("/")} />
            {proprietario ? <><MenuLink icon="card-outline" label="Minha assinatura" onPress={() => navegar("/assinatura")} /><MenuLink icon="people-outline" label="Clientes" onPress={() => navegar("/clientes")} /><MenuLink icon="business-outline" label="Usinas" onPress={() => navegar("/usinas")} /><MenuLink icon="flash-outline" label="Unidades consumidoras" onPress={() => navegar("/unidades")} /><MenuLink icon="document-text-outline" label="Contratos dos clientes" onPress={() => navegar("/contratos")} /><MenuLink icon="wallet-outline" label="Financeiro" onPress={() => navegar("/financeiro")} />{usuario?.perfil === "ADMIN" ? <MenuLink icon="layers-outline" label="Empresas parceiras" onPress={() => navegar("/admin/empresas")} /> : null}</> : <><MenuLink icon="receipt-outline" label="Minhas faturas" onPress={() => navegar("/faturas")} /><MenuLink icon="document-text-outline" label="Meu contrato" onPress={() => navegar("/contrato")} /></>}
            <MenuLink icon="person-outline" label="Perfil" onPress={() => navegar("/perfil")} />
            <MenuLink icon="play-circle-outline" label="Tutoriais" onPress={() => navegar("/tutoriais")} />
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
  subpageHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },
  subpageBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  subpageIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  subpageCopy: { flex: 1, minWidth: 0 },
  subpageTitle: { color: "#FFF", fontSize: Typography.body, fontWeight: "800" },
  subpageSubtitle: { marginTop: 2, color: "rgba(255,255,255,.78)", fontSize: Typography.small },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
  },

  environmentSwitch: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  environmentCurrent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  environmentLabel: { color: "#D8F0E3", fontSize: 11, fontWeight: "700" },
  environmentAction: { marginRight: 3, color: "#F6CC32", fontSize: 10, fontWeight: "900" },

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

  sectionLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 10,
    fontWeight: "700",
  },

  contextTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  title: {
    flexShrink: 1,
    color: Colors.surface,
    fontSize: Typography.body,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 1,
    color: "rgba(255,255,255,0.82)",
    fontSize: Typography.small,
  },

  action: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: { position: "absolute", top: 2, right: 0, minWidth: 17, height: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderRadius: Radius.round, backgroundColor: "#DC2626" },
  notificationBadgeText: { color: Colors.surface, fontSize: 10, fontWeight: "800" },
  plantBar: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md, padding: Spacing.xs, borderRadius: Radius.md, backgroundColor: "rgba(255,255,255,0.12)" },
  plantLogo: { width: 94, height: 36, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs },
  companyLogo: { width: 90, height: 30 },
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

  contextBadge: { marginLeft: Spacing.sm, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,0.16)" },
  contextBadgeSuccess: { backgroundColor: "rgba(22,163,74,0.28)" },
  contextBadgeDanger: { backgroundColor: "rgba(220,38,38,0.30)" },
  contextBadgeText: { color: Colors.surface, fontSize: 10, fontWeight: "800" },
  contextBadgeTextSuccess: { color: "#DCFCE7" },
  contextBadgeTextDanger: { color: "#FEE2E2" },
});
