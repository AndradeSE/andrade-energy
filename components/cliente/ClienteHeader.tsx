import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { listarFaturas } from "../../services/faturas.service";

import {
  Colors,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from "../../theme";

import {
  Avatar,
  Divider,
} from "../ui";

import MenuItem from "./MenuItem";
import PortalBrandLogo from "../brand/PortalBrandLogo";

type Props = {
  cliente: string;
  uc: string;
  distribuidora: string;
  onOpenProfile?: () => void;
  fullBleed?: boolean;
};

export default function ClienteHeader({
  cliente,
  uc,
  distribuidora,
  onOpenProfile,
  fullBleed = false,
}: Props) {
  const [
    menuAberto,
    setMenuAberto,
  ] =
    useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [lidas, setLidas] = useState<string[]>([]);

  const {
    logout,
    selecionarUnidade,
    usuario,
  } =
    useAuth();

  const chaveNotificacoesLidas = `andrade_energy_notificacoes_lidas_${usuario?.id ?? "anon"}`;

  useEffect(() => {
    let ativo = true;
    Promise.all([AsyncStorage.getItem(chaveNotificacoesLidas), AsyncStorage.getItem("andrade_energy_notificacoes_lidas")]).then(([valor, legado]) => {
      const ids = valor ? JSON.parse(valor) : [];
      const idsLegados = legado ? JSON.parse(legado) : [];
      const unidas = Array.from(new Set([...(Array.isArray(ids) ? ids : []), ...(Array.isArray(idsLegados) ? idsLegados : [])]));
      if (ativo) setLidas(unidas);
      void AsyncStorage.setItem(chaveNotificacoesLidas, JSON.stringify(unidas));
    }).catch(() => undefined);
    listarFaturas().then((faturas) => {
      if (!ativo) return;
      const hoje = new Date();
      const avisos = (faturas ?? []).flatMap((fatura: any) => {
        const status = String(fatura.cobrancas?.[0]?.status ?? fatura.status ?? "").toUpperCase();
        if (["PAGA", "PAGO", "QUITADA"].includes(status) || !fatura.vencimento) return [];
        const dias = Math.ceil((new Date(`${fatura.vencimento}T23:59:59`).getTime() - hoje.getTime()) / 86400000);
        if (dias < 0) return [{ id: fatura.id, severidade: "alta", titulo: "Fatura vencida", detalhe: fatura.referencia ?? "Competência não informada", rota: `/faturas/${fatura.id}` }];
        if (dias <= 5) return [{ id: fatura.id, severidade: "media", titulo: "Fatura próxima do vencimento", detalhe: `Vence em ${dias} dia${dias === 1 ? "" : "s"}`, rota: `/faturas/${fatura.id}` }];
        return [];
      });
      Promise.all([AsyncStorage.getItem(chaveNotificacoesLidas), AsyncStorage.getItem("andrade_energy_notificacoes_lidas")]).then(([valor, legado]) => {
        const ids = valor ? JSON.parse(valor) : [];
        const idsLegados = legado ? JSON.parse(legado) : [];
        const idsLidos = Array.from(new Set([...(Array.isArray(ids) ? ids : []), ...(Array.isArray(idsLegados) ? idsLegados : [])]));
        setNotificacoes(avisos.filter((aviso: any) => !idsLidos.includes(aviso.id) && !idsLidos.includes(`vencida-${aviso.id}`) && !idsLidos.includes(`vence-${aviso.id}`)));
      }).catch(() => setNotificacoes(avisos));
    }).catch(() => { if (ativo) setNotificacoes([]); });
    return () => { ativo = false; };
  }, [chaveNotificacoesLidas]);

  async function marcarComoLida(id: string) {
    const novas = Array.from(new Set([...lidas, id]));
    setLidas(novas);
    setNotificacoes((lista) => lista.filter((item) => item.id !== id));
    await AsyncStorage.setItem(chaveNotificacoesLidas, JSON.stringify(novas));
  }

  const insets =
    useSafeAreaInsets();

  const primeiroNome =
    cliente
      ?.trim()
      .split(" ")[0] ||
    "Cliente";

  function navegar(
    rota:
      | "/perfil"
      | "/faturas"
      | "/contrato"
      | "/unidades/recebimento-email"
  ) {
    setMenuAberto(
      false
    );

    if (
      rota === "/perfil" &&
      onOpenProfile
    ) {
      onOpenProfile();
      return;
    }

    router.navigate(rota);
  }

  function abrirPerfil() {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }

    router.push(
      "/perfil"
    );
  }

  async function trocarUnidade() {
    try {
      await selecionarUnidade(
        null
      );

      router.push(
        "/selecionar-unidade"
      );
    } catch (error) {
      console.log(
        "Erro ao trocar unidade:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível abrir a seleção de unidade."
      );
    }
  }

  function confirmarSaida() {
    setMenuAberto(
      false
    );

    Alert.alert(
      "Sair",
      "Deseja realmente sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },

        {
          text: "Sair",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  }

  return (
    <>
      <LinearGradient
        colors={[
          "#082F26",
          "#0B4A39",
          "#0A5B43",
        ]}
        end={{
          x: 1,
          y: 0.85,
        }}
        start={{
          x: 0,
          y: 0,
        }}
        style={[
          styles.container,
          {
            marginTop: fullBleed ? -insets.top : 0,
            paddingTop:
              insets.top +
              Spacing.xs,
          },
        ]}
      >
        <View
          style={
            styles.top
          }
        >
          <TouchableOpacity
            accessibilityLabel="Abrir menu"
            activeOpacity={
              0.8
            }
            onPress={() =>
              setMenuAberto(
                true
              )
            }
            style={
              styles.iconButton
            }
          >
            <Ionicons
              name="menu"
              size={26}
              color={
                Colors.surface
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Abrir perfil"
            activeOpacity={
              0.8
            }
            onPress={
              abrirPerfil
            }
            style={
              styles.profile
            }
          >
            <Avatar
              name={
                cliente
              }
              size={38}
            />

            <View
              style={
                styles.greetingContent
              }
            >
              <Text
                style={
                  styles.greeting
                }
              >
                Olá, {primeiroNome}
              </Text>

              <Text
                style={
                  styles.greetingSubtitle
                }
              >
                {distribuidora}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Notificações"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={
              0.8
            }
            onPress={() => setNotificacoesAbertas(true)}
            style={
              styles.iconButton
            }
          >
            <Ionicons
              name={notificacoes.length ? "notifications" : "notifications-outline"}
              size={24}
              color={
                Colors.surface
              }
            />
          </TouchableOpacity>
          {notificacoes.length ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notificacoes.length > 9 ? "9+" : notificacoes.length}</Text></View> : null}
        </View>

        <TouchableOpacity
          accessibilityLabel="Trocar unidade consumidora"
          activeOpacity={
            0.82
          }
          onPress={
            trocarUnidade
          }
          style={
            styles.unitCard
          }
          >
            <View
              style={
                styles.unitLogo
              }
            >
              <PortalBrandLogo height={28} width={84} />
            </View>

          <View
            style={
              styles.unitContent
            }
          >
            <Text
              style={
                styles.unitCode
              }
            >
              {uc}
            </Text>

            <Text
              style={
                styles.unitDetail
              }
            >
              {distribuidora} · Unidade consumidora
            </Text>
          </View>

          <Text
            style={
              styles.changeText
            }
          >
            Trocar
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={
              Colors.primary
            }
          />
        </TouchableOpacity>
      </LinearGradient>

      <Modal animationType="fade" transparent visible={notificacoesAbertas} onRequestClose={() => setNotificacoesAbertas(false)}>
        <Pressable style={styles.notificationBackdrop} onPress={() => setNotificacoesAbertas(false)}>
          <Pressable style={styles.notificationPanel} onPress={(evento) => evento.stopPropagation()}>
            <View style={styles.notificationHeader}><Text style={styles.notificationTitle}>Notificações</Text><TouchableOpacity onPress={() => setNotificacoesAbertas(false)}><Ionicons name="close" size={25} color={Colors.text} /></TouchableOpacity></View>
            {notificacoes.length ? notificacoes.map((aviso) => <TouchableOpacity key={aviso.id} style={styles.notificationItem} onPress={async () => { await marcarComoLida(aviso.id); setNotificacoesAbertas(false); router.push(aviso.rota as any); }}><View style={[styles.notificationDot, aviso.severidade === "alta" && styles.notificationDotHigh]} /><View style={styles.notificationCopy}><Text style={styles.notificationItemTitle}>{aviso.titulo}</Text><Text style={styles.notificationDetail}>{aviso.detalhe}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></TouchableOpacity>) : <View style={styles.emptyNotifications}><Ionicons name="checkmark-circle-outline" size={34} color={Colors.primary} /><Text style={styles.notificationItemTitle}>Tudo em dia</Text></View>}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() =>
          setMenuAberto(
            false
          )
        }
        transparent
        visible={
          menuAberto
        }
      >
        <View
          style={
            styles.modal
          }
        >
          <View
            style={
              styles.drawer
            }
          >
            <View
              style={
                styles.drawerHeader
              }
            >
              <Avatar
                name={
                  cliente
                }
                size={48}
              />

              <View
                style={
                  styles.drawerUser
                }
              >
                <Text
                  style={
                    styles.drawerName
                  }
                >
                  {cliente}
                </Text>

                <Text
                  style={
                    styles.drawerSubtitle
                  }
                >
                  Área do cliente
                </Text>
              </View>
            </View>

            <Divider />

            <MenuItem
              icon="person-outline"
              label="Perfil"
              onPress={() =>
                navegar(
                  "/perfil"
                )
              }
            />

            <MenuItem
              icon="document-text-outline"
              label="Minhas faturas"
              onPress={() =>
                navegar(
                  "/faturas"
                )
              }
            />

            <MenuItem
              icon="mail-unread-outline"
              label="Receber contas automaticamente"
              onPress={() =>
                navegar(
                  "/unidades/recebimento-email"
                )
              }
            />

            <MenuItem
              icon="document-outline"
              label="Meu contrato"
              onPress={() =>
                navegar(
                  "/contrato"
                )
              }
            />

            <Divider />

            <MenuItem
              icon="log-out-outline"
              label="Sair da conta"
              onPress={
                confirmarSaida
              }
            />
          </View>

          <Pressable
            accessibilityLabel="Fechar menu"
            onPress={() =>
              setMenuAberto(
                false
              )
            }
            style={
              styles.backdrop
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    container: {
      paddingHorizontal:
        Spacing.lg,

      paddingBottom:
        Spacing.sm,
    },

    top: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    iconButton: {
      width: 36,

      height: 36,

      justifyContent:
        "center",

      alignItems:
        "center",

      borderRadius:
        Radius.round,

      backgroundColor:
        "rgba(255, 255, 255, 0.08)",
    },
    notificationBadge: { position: "absolute", top: -2, right: -2, minWidth: 17, height: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderRadius: Radius.round, backgroundColor: "#DC2626" },
    notificationBadgeText: { color: Colors.surface, fontSize: 10, fontWeight: "800" },
    notificationBackdrop: { flex: 1, alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.45)" },
    notificationPanel: { width: "88%", marginTop: 90, padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.surface },
    notificationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
    notificationTitle: { color: Colors.text, fontSize: Typography.title, fontWeight: "800" },
    notificationItem: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.border },
    notificationDot: { width: 10, height: 10, marginRight: Spacing.sm, borderRadius: Radius.round, backgroundColor: Colors.secondary },
    notificationDotHigh: { backgroundColor: Colors.danger },
    notificationCopy: { flex: 1 },
    notificationItemTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
    notificationDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
    emptyNotifications: { alignItems: "center", paddingVertical: Spacing.xl },

    profile: {
      flex: 1,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginHorizontal:
        Spacing.xs,
    },

    greetingContent: {
      marginLeft:
        Spacing.sm,
    },

    greeting: {
      color:
        Colors.surface,

      fontSize:
        Typography.body,

      fontWeight:
        "700",
    },

    greetingSubtitle: {
      marginTop: 2,

      color:
        "#CBD5E1",

      fontSize:
        Typography.small,
    },

    unitCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop:
        Spacing.sm,

      paddingHorizontal:
        Spacing.sm,

      paddingVertical:
        7,

      borderRadius:
        Radius.md,

      borderWidth:
        1,

      borderColor:
        "rgba(255, 255, 255, 0.28)",

      backgroundColor:
        "rgba(255, 255, 255, 0.16)",
    },

    unitIcon: {
      width: 30,

      height: 30,

      borderRadius: 10,

      justifyContent:
        "center",

      alignItems:
        "center",

      backgroundColor:
        Colors.primary,
    },
    unitLogo: { width: 88, height: 32, alignItems: "center", justifyContent: "center" },

    unitContent: {
      flex: 1,

      marginLeft:
        Spacing.sm,
    },

    unitCode: {
      color:
        Colors.surface,

      fontSize:
        Typography.caption,

      fontWeight:
        "700",
    },

    unitDetail: {
      marginTop: 1,

      color:
        "#CBD5E1",

      fontSize:
        Typography.small,
    },

    changeText: {
      marginRight: 3,

      color:
        Colors.surface,

      fontSize: 10,

      fontWeight:
        "800",
    },

    modal: {
      flex: 1,

      flexDirection:
        "row",
    },

    backdrop: {
      flex: 1,

      backgroundColor:
        "rgba(15, 23, 42, 0.35)",
    },

    drawer: {
      width: "82%",

      height: "100%",

      paddingTop:
        Spacing.xxl,

      paddingHorizontal:
        Spacing.lg,

      backgroundColor:
        Colors.surface,

      ...Shadows.card,
    },

    drawerHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingBottom:
        Spacing.lg,
    },

    drawerUser: {
      flex: 1,

      marginLeft:
        Spacing.md,
    },

    drawerName: {
      color:
        Colors.text,

      fontSize:
        Typography.body,

      fontWeight:
        "700",
    },

    drawerSubtitle: {
      marginTop: 2,

      color:
        Colors.subtitle,

      fontSize:
        Typography.caption,
    },
  });
