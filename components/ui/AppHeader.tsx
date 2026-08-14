import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
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
  const { logout, usuario } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const proprietario = usuario?.perfil === "ADMIN" || usuario?.perfil === "GESTOR";

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
    <View style={styles.container}>
      <View style={styles.top}>
        <TouchableOpacity
          accessibilityLabel="Abrir perfil"
          activeOpacity={0.8}
          onPress={() => router.push("/perfil")}
          style={styles.profileButton}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={21} color={Colors.surface} />
          </View>

          <View style={styles.titleContent}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>

            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Abrir menu"
          activeOpacity={0.8}
          onPress={() => setMenuAberto(true)}
          style={styles.action}
        >
          <Ionicons
            name="menu-outline"
            size={30}
            color={Colors.surface}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name={icon} size={22} color={Colors.primary} />
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
            {proprietario ? <><MenuLink icon="people-outline" label="Clientes" onPress={() => navegar("/clientes")} /><MenuLink icon="business-outline" label="Usinas" onPress={() => navegar("/usinas")} /><MenuLink icon="flash-outline" label="Unidades consumidoras" onPress={() => navegar("/unidades/index")} /><MenuLink icon="document-text-outline" label="Contratos dos clientes" onPress={() => navegar("/contratos/index")} /><MenuLink icon="wallet-outline" label="Financeiro" onPress={() => navegar("/financeiro")} /></> : <><MenuLink icon="receipt-outline" label="Minhas faturas" onPress={() => navegar("/faturas")} /><MenuLink icon="document-text-outline" label="Meu contrato" onPress={() => navegar("/contrato")} /></>}
            <MenuLink icon="person-outline" label="Perfil" onPress={() => navegar("/perfil")} />
            <View style={styles.menuDivider} /><MenuLink icon="log-out-outline" label="Sair da conta" danger onPress={confirmarSaida} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuLink({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <TouchableOpacity onPress={onPress} style={styles.menuLink}><Ionicons name={icon} size={22} color={danger ? Colors.danger : Colors.primary} /><Text style={[styles.menuLabel, danger && styles.menuDanger]}>{label}</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.header,
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
  backdrop: { flex: 1, alignItems: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  menu: { width: "84%", height: "100%", paddingHorizontal: Spacing.lg, paddingTop: 58, backgroundColor: Colors.surface },
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
    borderRadius: Radius.md,
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
