import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { Avatar, Divider } from "../ui";
import MenuItem from "./MenuItem";

type Props = {
  cliente: string;
  uc: string;
  distribuidora: string;
  onOpenProfile?: () => void;
};

export default function ClienteHeader({
  cliente,
  uc,
  distribuidora,
  onOpenProfile,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { logout } = useAuth();
  const primeiroNome = cliente.split(" ")[0];

  function navegar(rota: "/perfil" | "/faturas" | "/contrato") {
    setMenuAberto(false);

    if (rota === "/perfil" && onOpenProfile) {
      onOpenProfile();
      return;
    }

    router.push(rota);
  }

  function abrirPerfil() {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }

    router.push("/perfil");
  }

  function confirmarSaida() {
    setMenuAberto(false);

    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.top}>
          <TouchableOpacity
            accessibilityLabel="Abrir menu"
            activeOpacity={0.8}
            onPress={() => setMenuAberto(true)}
            style={styles.iconButton}
          >
            <Ionicons name="menu" size={26} color={Colors.surface} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Abrir perfil"
            activeOpacity={0.8}
            onPress={abrirPerfil}
            style={styles.profile}
          >
            <Avatar name={cliente} size={44} />

            <View style={styles.greetingContent}>
              <Text style={styles.greeting}>Olá, {primeiroNome}</Text>
              <Text style={styles.greeting}>Bem-vindo de volta</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Sair da conta"
            activeOpacity={0.8}
            onPress={confirmarSaida}
            style={styles.iconButton}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={Colors.surface}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.unitCard}>
          <View style={styles.unitIcon}>
            <Ionicons name="flash" size={22} color={Colors.primary} />
          </View>

          <View style={styles.unitContent}>
            <Text style={styles.unitCode}>{uc}</Text>
            <Text style={styles.unitDetail}>
              {distribuidora} · Unidade consumidora
            </Text>
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setMenuAberto(false)}
        transparent
        visible={menuAberto}
      >
        <View style={styles.modal}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Avatar name={cliente} size={48} />

              <View style={styles.drawerUser}>
                <Text style={styles.drawerName}>{cliente}</Text>
                <Text style={styles.drawerSubtitle}>Área do cliente</Text>
              </View>
            </View>

            <Divider />

            <MenuItem
              icon="person-outline"
              label="Meu perfil"
              onPress={() => navegar("/perfil")}
            />

            <MenuItem
              icon="document-text-outline"
              label="Minhas faturas"
              onPress={() => navegar("/faturas")}
            />

            <MenuItem
              icon="document-outline"
              label="Meu contrato"
              onPress={() => navegar("/contrato")}
            />

            <Divider />

            <MenuItem
              icon="log-out-outline"
              label="Sair da conta"
              onPress={confirmarSaida}
            />
          </View>

          <Pressable
            accessibilityLabel="Fechar menu"
            onPress={() => setMenuAberto(false)}
            style={styles.backdrop}
          />
        </View>
      </Modal>
    </>
  );
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

  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  profile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.xs,
  },

  greetingContent: {
    marginLeft: Spacing.sm,
  },

  greeting: {
    color: Colors.surface,
    fontSize: Typography.caption,
    fontWeight: "600",
  },

  unitCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },

  unitIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
  },

  unitContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },

  unitCode: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },

  unitDetail: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },

  modal: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },

  drawer: {
    width: "82%",
    height: "100%",
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },

  drawerUser: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  drawerName: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },

  drawerSubtitle: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
});
