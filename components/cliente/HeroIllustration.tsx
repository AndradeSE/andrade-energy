import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  saldo: number;
};

export default function HeroIllustration({
  saldo,
}: Props) {
  return (
    <View style={styles.container}>

      <View style={styles.illustration}>

        <View style={styles.sun}>
          <Ionicons
            name="sunny"
            size={34}
            color="#FDBA21"
          />
        </View>

        <View style={styles.house}>

          <Ionicons
            name="home"
            size={82}
            color="#0F8F5B"
          />

        </View>

        <View style={styles.energy}>

          <Ionicons
            name="flash"
            size={28}
            color="#FFFFFF"
          />

        </View>

      </View>

      <Text style={styles.title}>
        Sua energia está trabalhando por você
      </Text>

      <Text style={styles.subtitle}>
        A energia produzida pela usina será utilizada
        automaticamente nas próximas faturas da sua unidade
        consumidora.
      </Text>

      <View style={styles.card}>

        <Text style={styles.cardLabel}>
          Energia disponível
        </Text>

        <Text style={styles.cardValue}>
          {Number(saldo).toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })}{" "}
          kWh
        </Text>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    alignItems: "center",
    marginBottom: 34,
  },

  illustration: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },

  house: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  },

  sun: {
    position: "absolute",
    top: 28,
    right: 28,
  },

  energy: {
    position: "absolute",
    bottom: 48,
    right: 46,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 22,
    fontSize: 15,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
    alignItems: "center",
  },

  cardLabel: {
    color: "#64748B",
    fontSize: 14,
  },

  cardValue: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "700",
    color: "#16A34A",
  },

});
