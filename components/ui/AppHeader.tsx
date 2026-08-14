import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const { logout } = useAuth();

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
          accessibilityLabel="Sair da conta"
          activeOpacity={0.8}
          onPress={confirmarSaida}
          style={styles.action}
        >
          <Ionicons
            name="log-out-outline"
            size={24}
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
    </View>
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
