import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
    ImageBackground,
    ScrollView,
    Text,
    View,
} from "react-native";

import { buscarFechamento } from "../../services/fechamentos.service";

export default function DetalheFechamento() {

  const { id } = useLocalSearchParams();

  const [fechamento,setFechamento]=
    useState<any>();

  useEffect(()=>{

    carregar();

  },[]);

  async function carregar(){

    const dados=
      await buscarFechamento(
        String(id)
      );

    setFechamento(dados);

  }

  if(!fechamento)
    return null;

  return(

<ImageBackground

source={require("../../assets/images/background.png")}

style={{
flex:1
}}

>

<ScrollView
contentContainerStyle={{
padding:20
}}
>

<Text
style={{
color:"#FFF",
fontSize:28,
fontWeight:"bold",
marginBottom:20,
}}
>

{fechamento.competencia}

</Text>

<View
style={{
backgroundColor:"#FFF",
padding:20,
borderRadius:12,
marginBottom:15,
}}
>

<Text>

Usina

</Text>

<Text
style={{
fontWeight:"bold",
fontSize:18,
}}
>

{fechamento.usinas.nome}

</Text>

<Text>

Energia Gerada

</Text>

<Text>

{Number(fechamento.energia_gerada).toFixed(0)} kWh

</Text>

<Text>

Energia Alocada

</Text>

<Text>

{Number(fechamento.energia_alocada).toFixed(0)} kWh

</Text>

<Text>

Disponível

</Text>

<Text>

{Number(fechamento.energia_disponivel).toFixed(0)} kWh

</Text>

<Text>

Ocupação

</Text>

<Text>

{Number(fechamento.ocupacao).toFixed(1)} %

</Text>

</View>

<Text
style={{
color:"#FFF",
fontWeight:"bold",
fontSize:22,
marginBottom:10,
}}
>

Rateio

</Text>

{
fechamento.rateios.map(
(rateio:any)=>(

<View

key={rateio.id}

style={{

backgroundColor:"#FFF",

padding:15,

borderRadius:12,

marginBottom:10,

}}

>

<Text>

{rateio.clientes.nome}

</Text>

<Text>

UC {rateio.clientes.uc}

</Text>

<Text>

Energia

{Number(rateio.energia).toFixed(0)} kWh

</Text>

<Text>

Economia

R$ {Number(rateio.economia).toFixed(2)}

</Text>

</View>

))
}

</ScrollView>

</ImageBackground>

);

}