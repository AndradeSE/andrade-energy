import { router } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useFaturas } from "../../hooks/useFaturas";

import {
  Badge,
  Card,
  EmptyState,
  Loading,
  Screen,
} from "../../components/ui";

import {
  Colors,
  Spacing,
  Typography,
} from "../../theme";

export default function Faturas() {

  const {
    data,
    isLoading,
    error,
  } = useFaturas();

  if (isLoading)
    return <Loading />;

  if (error)
    return <Screen />;

  return (

    <Screen>

      <FlatList
        data={data ?? []}
        keyExtractor={(item)=>item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}

        ListHeaderComponent={

          <>

            <Text style={styles.title}>
              Minhas Faturas
            </Text>

            <Text style={styles.subtitle}>
              Histórico completo de cobranças
            </Text>

          </>

        }

        ListEmptyComponent={

          <EmptyState
            icon="document-text-outline"
            title="Nenhuma fatura encontrada"
            subtitle="Assim que existir uma cobrança ela aparecerá aqui."
          />

        }

        renderItem={({item})=>{

          const valor=
          Number(
            item.valor_total ??
            item.valor_final ??
            0
          );

          const status=item.status ?? "";

          function variant(){

            switch(status){

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

<TouchableOpacity

activeOpacity={0.9}

onPress={()=>router.push(`/faturas/${item.id}`)}

>

<Card>

<View style={styles.header}>

<View>

<Text style={styles.comp}>

{item.referencia}

</Text>

<Text style={styles.venc}>

Vencimento {item.vencimento}

</Text>

</View>

<View style={styles.icon}>

<Ionicons

name="document-text"

size={28}

color={Colors.primary}

/>

</View>

</View>

<Text style={styles.value}>

R$ {valor.toLocaleString(

"pt-BR",

{

minimumFractionDigits:2,

}

)}

</Text>

<View style={styles.footer}>

<Text style={styles.energy}>

{Number(

item.energia_compensada ??

item.consumo_kwh ??

0

).toLocaleString("pt-BR")} kWh

</Text>

<Badge

label={status}

variant={variant()}

/>

</View>

</Card>

</TouchableOpacity>

);

}}

      />

    </Screen>

  );

}

const styles=StyleSheet.create({

content:{

padding:Spacing.lg,

paddingBottom:120,

},

title:{

fontSize:34,

fontWeight:"700",

color:Colors.text,

},

subtitle:{

marginTop:6,

marginBottom:28,

fontSize:Typography.body,

color:Colors.subtitle,

},

header:{

flexDirection:"row",

justifyContent:"space-between",

alignItems:"center",

},

comp:{

fontSize:24,

fontWeight:"700",

color:Colors.text,

},

venc:{

marginTop:4,

color:Colors.subtitle,

},

icon:{

width:60,

height:60,

borderRadius:20,

backgroundColor:Colors.primaryLight,

justifyContent:"center",

alignItems:"center",

},

value:{

marginTop:24,

fontSize:38,

fontWeight:"700",

color:Colors.text,

},

footer:{

marginTop:22,

flexDirection:"row",

justifyContent:"space-between",

alignItems:"center",

},

energy:{

fontWeight:"600",

color:Colors.subtitle,

fontSize:15,

},

});