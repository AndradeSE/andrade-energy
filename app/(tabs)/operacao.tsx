import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Card from "../../components/Card";
import DashboardCard from "../../components/DashboardCard";

import {
  listarFechamentos,
  obterResumoOperacao,
} from "../../services/fechamentos.service";

export default function Operacao() {

    const [resumo, setResumo] =
  useState<any>();

  const [lista, setLista] =
    useState<any[]>([]);

  useEffect(() => {

    carregar();

  }, []);

  async function carregar() {

    const resumoOperacao =
  await obterResumoOperacao();

setResumo(resumoOperacao);

    const dados =
      await listarFechamentos();
      console.log("FECHAMENTOS", dados);


    setLista(dados);

  }

 return (
  <ImageBackground
    source={require("../../assets/images/background.png")}
    style={{
      flex: 1,
      padding: 20,
    }}
  >
    <Text
  style={{
    color: "black",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
  }}
>
  Operação
</Text>
<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  }}
>

  <DashboardCard
    titulo="Fechamentos"
    valor={String(resumo?.fechamentos ?? 0)}
    icone="📋"
  />

  <DashboardCard
    titulo="Energia"
    valor={`${Number(resumo?.energiaGerada ?? 0).toFixed(0)} kWh`}
    icone="⚡"
  />

  <DashboardCard
    titulo="Disponível"
    valor={`${Number(resumo?.energiaDisponivel ?? 0).toFixed(0)} kWh`}
    icone="🔋"
  />

  <DashboardCard
    titulo="Receita"
    valor={`R$ ${Number(resumo?.receitaPrevista ?? 0).toFixed(2)}`}
    icone="💰"
  />

</View>
    
    <FlatList
      data={lista}
      keyExtractor={(i) => i.id}
      ListEmptyComponent={() => (

<View
style={{
marginTop:60,
alignItems:"center",
}}
>
    <Card>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  }}
>

<Text
style={{
fontSize:70,
}}
>

🏭

</Text>

<Text
style={{
color:"#FFF",
fontSize:22,
fontWeight:"bold",
marginTop:15,
}}
>

Nenhum fechamento realizado

</Text>

<Text
style={{
color:"#E2E8F0",
textAlign:"center",
marginTop:10,
paddingHorizontal:30,
}}
>

Toque no botão "+" para realizar o primeiro fechamento da usina.

</Text>
</View>

</Card>
</View>

)}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            router.push(`/operacao/${item.id}`)
          }
          style={{
            backgroundColor: "rgba(255,255,255,.9)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text>{item.usinas?.nome}</Text>
          <Text>{item.competencia}</Text>
          <Text>{Number(item.ocupacao ?? 0).toFixed(1)}%</Text>
        </TouchableOpacity>
      )}
    />
    <TouchableOpacity
  onPress={() => router.push("/operacao/novo")}
  style={{
    position: "absolute",
    right: 20,
    bottom: 50, // acima da barra de navegação
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  }}
>
  <Text
    style={{
      color: "#FFF",
      fontSize: 32,
      fontWeight: "bold",
      marginTop: -2,
    }}
  >
    +
  </Text>
  
</TouchableOpacity>
  </ImageBackground>
  
);

}
