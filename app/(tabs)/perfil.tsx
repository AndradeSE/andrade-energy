import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";

export default function Perfil() {
  const { usuario, logout } = useAuth();

  function confirmarSaida() {
    Alert.alert(
      "Sair",
      "Deseja realmente sair?",
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

  function Menu({
    icon,
    titulo,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    titulo: string;
    onPress?: () => void;
  }) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.menu}
        onPress={onPress}
      >
        <Ionicons
          name={icon}
          size={22}
          color="#16A34A"
        />

        <Text style={styles.menuText}>
          {titulo}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#94A3B8"
        />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          titulo={usuario?.nome ?? ""}
          subtitulo={usuario?.email}
        />

        <Card>

          <Text style={styles.section}>
            Minha Conta
          </Text>

          {usuario?.perfil === "LEITURA" && (
            <>
              <Menu
                icon="document-text-outline"
                titulo="Contrato"
                onPress={() =>
                  router.push("/contrato")
                }
              />

              <Menu
                icon="flash-outline"
                titulo="Minha Unidade"
              />
            </>
          )}

          {usuario?.perfil === "GESTOR" && (
            <>
              <Menu
                icon="business-outline"
                titulo="Minha Usina"
              />
            </>
          )}

          {usuario?.perfil === "ADMIN" && (
            <>
              <Menu
                icon="people-outline"
                titulo="Usuários"
              />

              <Menu
                icon="settings-outline"
                titulo="Configurações"
              />
            </>
          )}

        </Card>

        <Card>

          <Text style={styles.section}>
            Ajuda
          </Text>

          <Menu
            icon="logo-whatsapp"
            titulo="Suporte"
          />

          <Menu
            icon="document-outline"
            titulo="Termos de Uso"
          />

          <Menu
            icon="shield-checkmark-outline"
            titulo="Política de Privacidade"
          />

        </Card>

        <Card>

          <Text style={styles.version}>
            Andrade Energy
          </Text>

          <Text style={styles.build}>
            Versão 1.0.0
          </Text>

        </Card>

        <TouchableOpacity
          style={styles.logout}
          onPress={confirmarSaida}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#FFF"
          />

          <Text style={styles.logoutText}>
            Sair da conta
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  section: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  menu: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },

  version: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  build: {
    marginTop: 4,
    color: "#64748B",
  },

  logout: {
    marginTop: 25,
    backgroundColor: "#DC2626",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  logoutText: {
    color: "#FFF",
    marginLeft: 10,
    fontWeight: "700",
    fontSize: 16,
  },

});