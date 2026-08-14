import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar, Button, Card, Divider, Screen } from "../../components/ui";
import MenuItem from "../../components/cliente/MenuItem";
import { useAuth } from "../../contexts/AuthContext";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Perfil() {
  const { usuario, logout } = useAuth();

  function confirmarSaida() {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>MINHA CONTA</Text>
          <Text style={styles.title}>Perfil</Text>
        </View>

        <ImageBackground
          imageStyle={styles.profileBackground}
          resizeMode="cover"
          source={require("../../assets/images/background.png")}
          style={styles.profileCard}
        >
          <View style={styles.profileOverlay} />
          <View style={styles.profile}>
            <Avatar name={usuario?.nome ?? "Andrade Energy"} size={64} />

            <View style={styles.profileContent}>
              <Text numberOfLines={1} style={styles.name}>
                {usuario?.nome ?? ""}
              </Text>
              <Text numberOfLines={1} style={styles.email}>
                {usuario?.email ?? ""}
              </Text>

              <View style={styles.profileBadge}>
                <View style={styles.profileBadgeDot} />
                <Text style={styles.profileBadgeText}>Cliente Andrade Energy</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <Text style={styles.sectionTitle}>Conta e energia</Text>

        <Card>
          {usuario?.perfil === "LEITURA" ? (
            <>
              <MenuItem
                icon="document-text-outline"
                label="Meu contrato"
                onPress={() => router.push("/contrato")}
              />
              <Divider />
              <MenuItem
                icon="flash-outline"
                label="Minha unidade consumidora"
              />
              <Divider />
              <MenuItem
                icon="receipt-outline"
                label="Minhas faturas"
                onPress={() => router.push("/faturas")}
              />
            </>
          ) : null}

          {usuario?.perfil === "GESTOR" ? (
            <MenuItem icon="business-outline" label="Minha usina" />
          ) : null}

          {usuario?.perfil === "ADMIN" ? (
            <>
              <MenuItem icon="people-outline" label="Usuários" />
              <Divider />
              <MenuItem icon="settings-outline" label="Configurações" />
            </>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Suporte e informações</Text>

        <Card>
          <MenuItem icon="logo-whatsapp" label="Falar com o suporte" />
          <Divider />
          <MenuItem icon="document-outline" label="Termos de uso" />
          <Divider />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Política de privacidade"
          />
        </Card>

        <Button
          icon={<Ionicons name="log-out-outline" size={20} color={Colors.surface} />}
          onPress={confirmarSaida}
          style={styles.logout}
          title="Sair da conta"
        />

        <View style={styles.footer}>
          <Text style={styles.brand}>Andrade Energy</Text>
          <Text style={styles.version}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  heading: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary,
  },
  profileBackground: {
    borderRadius: Radius.xl,
  },
  profileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
  },
  profileContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    color: Colors.surface,
    fontSize: Typography.card,
    fontWeight: "700",
  },
  email: {
    marginTop: 3,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  profileBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
  },
  profileBadgeDot: {
    width: 7,
    height: 7,
    marginRight: Spacing.xs,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  profileBadgeText: {
    color: Colors.primaryDark,
    fontSize: Typography.small,
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  logout: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.danger,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  brand: {
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  version: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
});
