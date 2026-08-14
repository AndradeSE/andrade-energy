import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useEffect, useState } from "react";

import {
  Badge,
  Card,
  Divider,
  Loading,
  Screen,
} from "../../components/ui";

import {
  Colors,
  Spacing,
  Typography
} from "../../theme";

import { buscarFatura } from "../../services/faturas.service";

export default function DetalheFatura() {

  const { id } = useLocalSearchParams();

  const [fatura,setFatura]=
    useState<any>();

  useEffect(()=>{

    carregar();

  },[]);

  async function carregar(){

    const dados=
      await buscarFatura(
        String(id)
      );

    setFatura(dados);

  }

  if(!fatura)
    return <Loading/>;

  function badge(){

    switch(fatura.status){

      case "PAGA":
        return "success";

      case "VENCIDA":
        return "danger";

      case "EM ABERTO":
      case "ABERTA":
        return "warning";

      default:
        return "info";

    }

  }

  return(

<Screen>

<ScrollView

showsVerticalScrollIndicator={false}

contentContainerStyle={styles.content}

>

<Card>

<Text style={styles.reference}>

{fatura.referencia}

</Text>

<Text style={styles.value}>

R$ {Number(

fatura.valor_total

).toLocaleString(

"pt-BR",

{

minimumFractionDigits:2,

}

)}

</Text>

<View style={styles.row}>

<Badge

label={fatura.status}

variant={badge()}

/>

<Text style={styles.date}>

Vence em {fatura.vencimento}

</Text>

</View>

</Card>

<Card>

<Text style={styles.section}>

Resumo

</Text>

<Divider/>

<View style={styles.metric}>

<Text style={styles.label}>

Energia compensada

</Text>

<Text style={styles.metricValue}>

{Number(

fatura.energia_compensada ??

0

).toLocaleString("pt-BR")} kWh

</Text>

</View>

<Divider/>

<View style={styles.metric}>

<Text style={styles.label}>

Economia

</Text>

<Text style={styles.metricValue}>

R$ {Number(

fatura.economia_real ??

0

).toLocaleString(

"pt-BR",

{

minimumFractionDigits:2,

}

)}

</Text>

</View>

<Divider/>

<View style={styles.metric}>

<Text style={styles.label}>

Saldo Atual

</Text>

<Text style={styles.metricValue}>

{Number(

fatura.saldo_atual ??

0

).toLocaleString("pt-BR")} kWh

</Text>

</View>

</Card>

<Card>

<TouchableOpacity style={styles.action}>

<Ionicons

name="download-outline"

size={22}

color={Colors.primary}

/>

<Text style={styles.actionText}>

Baixar PDF

</Text>

</TouchableOpacity>

<Divider/>

<TouchableOpacity style={styles.action}>

<Ionicons

name="share-social-outline"

size={22}

color={Colors.primary}

/>

<Text style={styles.actionText}>

Compartilhar

</Text>

</TouchableOpacity>

<Divider/>

<TouchableOpacity style={styles.action}>

<Ionicons

name="copy-outline"

size={22}

color={Colors.primary}

/>

<Text style={styles.actionText}>

Copiar Código de Barras

</Text>

</TouchableOpacity>

</Card>

</ScrollView>

</Screen>

);

}

const styles=StyleSheet.create({

content:{

padding:Spacing.lg,

paddingBottom:120,

},

reference:{

fontSize:30,

fontWeight:"700",

color:Colors.text,

},

value:{

marginTop:18,

fontSize:42,

fontWeight:"700",

color:Colors.primary,

},

row:{

marginTop:22,

flexDirection:"row",

justifyContent:"space-between",

alignItems:"center",

},

date:{

color:Colors.subtitle,

fontWeight:"600",

},

section:{

fontSize:Typography.section,

fontWeight:"700",

color:Colors.text,

marginBottom:Spacing.lg,

},

metric:{

paddingVertical:18,

},

label:{

fontSize:Typography.body,

color:Colors.subtitle,

},

metricValue:{

marginTop:6,

fontSize:28,

fontWeight:"700",

color:Colors.text,

},

action:{

paddingVertical:20,

flexDirection:"row",

alignItems:"center",

},

actionText:{

marginLeft:16,

fontSize:18,

fontWeight:"600",

color:Colors.text,

},

});