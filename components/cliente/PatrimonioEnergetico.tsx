import { StyleSheet, Text, View } from "react-native";

type Props = {
  produzido: number;
  compensado: number;
  creditos: number;
};

export default function PatrimonioEnergetico({
  produzido,
  compensado,
  creditos,
}: Props) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Patrimônio Energético
      </Text>

      <View style={styles.row}>

        <View style={styles.item}>

          <Text style={styles.number}>
            {Number(produzido).toFixed(0)}
          </Text>

          <Text style={styles.label}>
            Produzido
          </Text>

        </View>

        <View style={styles.separator} />

        <View style={styles.item}>

          <Text style={styles.number}>
            {Number(compensado).toFixed(0)}
          </Text>

          <Text style={styles.label}>
            Compensado
          </Text>

        </View>

        <View style={styles.separator} />

        <View style={styles.item}>

          <Text style={styles.number}>
            {Number(creditos).toFixed(0)}
          </Text>

          <Text style={styles.label}>
            Créditos
          </Text>

        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container:{
    backgroundColor:"#FFF",
    borderRadius:30,
    padding:24,
    marginBottom:24,
    elevation:5,
  },

  title:{
    fontSize:22,
    fontWeight:"700",
    color:"#111827",
    marginBottom:22,
  },

  row:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
  },

  item:{
    flex:1,
    alignItems:"center",
  },

  separator:{
    width:1,
    height:55,
    backgroundColor:"#E5E7EB",
  },

  number:{
    fontSize:30,
    fontWeight:"700",
    color:"#16A34A",
  },

  label:{
    marginTop:8,
    color:"#64748B",
    fontSize:14,
  },

});