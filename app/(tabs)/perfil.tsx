import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";

import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PerfilScreen() {

  const { usuario, logout } = useAuth();

  async function sair() {
    Alert.alert(
      "Sair",
      "Deseja realmente sair da conta?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/background.png")}
      style={styles.background}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>

          <Image
            source={require("../assets/images/icon.png")}
            style={styles.avatar}
          />

          <Text style={styles.nome}>
            {usuario?.nome}
          </Text>

          <Text style={styles.email}>
            {usuario?.email}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {usuario?.perfil}
            </Text>
          </View>

        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Minha Conta
          </Text>

          <View style={styles.item}>

            <Ionicons
              name="person-outline"
              size={22}
              color="#16A34A"
            />

            <View style={styles.itemText}>

              <Text style={styles.label}>
                Nome
              </Text>

              <Text style={styles.value}>
                {usuario?.nome}
              </Text>

            </View>

          </View>

          <View style={styles.item}>

            <Ionicons
              name="mail-outline"
              size={22}
              color="#16A34A"
            />

            <View style={styles.itemText}>

              <Text style={styles.label}>
                Email
              </Text>

              <Text style={styles.value}>
                {usuario?.email}
              </Text>

            </View>

          </View>

          <View style={styles.item}>

            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#16A34A"
            />

            <View style={styles.itemText}>

              <Text style={styles.label}>
                Perfil
              </Text>

              <Text style={styles.value}>
                {usuario?.perfil}
              </Text>

            </View>

          </View>
                    <TouchableOpacity style={styles.button}>
            <Ionicons
              name="create-outline"
              size={20}
              color="#FFF"
            />

            <Text style={styles.buttonText}>
              Editar Dados
            </Text>
          </TouchableOpacity>

        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Segurança
          </Text>

          <TouchableOpacity style={styles.menuItem}>

            <Ionicons
              name="lock-closed-outline"
              size={22}
              color="#16A34A"
            />

            <Text style={styles.menuText}>
              Alterar Senha
            </Text>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#94A3B8"
            />

          </TouchableOpacity>

        </View>

        {usuario?.perfil === "ADMIN" && (

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Administração
            </Text>

            <TouchableOpacity style={styles.menuItem}>

              <Ionicons
                name="people-outline"
                size={22}
                color="#16A34A"
              />

              <Text style={styles.menuText}>
                Gestão de Usuários
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94A3B8"
              />

            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>

              <Ionicons
                name="settings-outline"
                size={22}
                color="#16A34A"
              />

              <Text style={styles.menuText}>
                Configurações
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94A3B8"
              />

            </TouchableOpacity>

          </View>

        )}

        {usuario?.perfil === "GERADOR" && (

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Minha Usina
            </Text>

            <View style={styles.infoBox}>

              <Text style={styles.infoLabel}>
                Usina
              </Text>

              <Text style={styles.infoValue}>
                {usuario?.usina_id ?? "-"}
              </Text>

            </View>

          </View>

        )}

        {usuario?.perfil === "CLIENTE" && (

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Minha Unidade
            </Text>

            <View style={styles.infoBox}>

              <Text style={styles.infoLabel}>
                Cliente
              </Text>

              <Text style={styles.infoValue}>
                {usuario?.cliente_id ?? "-"}
              </Text>

            </View>

          </View>

        )}
                <TouchableOpacity
          style={styles.logout}
          activeOpacity={0.85}
          onPress={sair}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#FFF"
          />

          <Text style={styles.logoutText}>
            Sair da Conta
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  background: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
  },

  nome: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },

  email: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 15,
  },

  badge: {
    marginTop: 16,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  itemText: {
    marginLeft: 16,
    flex: 1,
  },

  label: {
    color: "#64748B",
    fontSize: 13,
  },

  value: {
    marginTop: 3,
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },

  button: {
    marginTop: 10,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  buttonText: {
    color: "#FFF",
    marginLeft: 10,
    fontWeight: "700",
    fontSize: 15,
  },
    menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },

  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 13,
  },

  infoValue: {
    marginTop: 6,
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },

  logout: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 40,
  },

  logoutText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 10,
  },

});