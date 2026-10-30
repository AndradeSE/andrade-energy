import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  saldo: number;
};

export default function EnergyWalletIllustration({
  saldo,
}: Props) {
  return (
    <View style={styles.container}>

      <View style={styles.sun}>
        <Ionicons
          name="sunny"
          size={34}
          color="#F59E0B"
        />
      </View>

      <View style={styles.house}>
        <Ionicons
          name="home"
          size={64}
          color="#16A34A"
        />
      </View>

      <View style={styles.energy}>
        <Ionicons
          name="flash"
          size={42}
          color="#FACC15"
        />
      </View>

      <Text style={styles.title}>
        Energia disponível
      </Text>

      <Text style={styles.value}>
        {Number(saldo).toFixed(0)} kWh
      </Text>

      <Text style={styles.subtitle}>
        Energia disponível para compensação
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container:{
    backgroundColor:"#FFF",
    borderRadius:30,
    alignItems:"center",
    paddingVertical:35,
    marginBottom:25,
    elevation:5,
  },

  sun:{
    position:"absolute",
    top:20,
    right:25,
  },

  house:{
    width:120,
    height:120,
    borderRadius:60,
    backgroundColor:"#ECFDF5",
    justifyContent:"center",
    alignItems:"center",
    marginBottom:20,
  },

  energy:{
    position:"absolute",
    left:85,
    top:115,
    backgroundColor:"#FFF",
    borderRadius:22,
    padding:8,
    elevation:6,
  },

  title:{
    color:"#64748B",
    fontSize:16,
  },

  value:{
    marginTop:6,
    fontSize:42,
    fontWeight:"700",
    color:"#111827",
  },

  subtitle:{
    marginTop:8,
    color:"#94A3B8",
    textAlign:"center",
    paddingHorizontal:35,
  },

});
