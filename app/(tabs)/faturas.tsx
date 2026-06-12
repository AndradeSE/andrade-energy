import { useEffect, useState } from 'react';

import {
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { supabase } from '../../supabase';

export default function Faturas() {
  const [faturas, setFaturas] =
    useState<any[]>([]);
    const [economiaTotal, setEconomiaTotal] =
  useState(0);

  async function carregar() {
    const { data } =
  await supabase
    .from('faturas')
    .select('*');

const lista = data || [];

setFaturas(lista);

setEconomiaTotal(
  lista.reduce(
    (acc, item) =>
      acc + Number(item.economia || 0),
    0
  )
);
}

async function excluirFatura(id: string) {
  Alert.alert(
    'Excluir Fatura',
    'Deseja realmente excluir esta fatura?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } =
            await supabase
              .from('faturas')
              .delete()
              .eq('id', id);

          if (error) {
            Alert.alert(
              'Erro',
              error.message
            );
            return;
          }

          carregar();

          Alert.alert(
            'Sucesso',
            'Fatura excluída'
          );
        },
      },
    ]
  );
}

useEffect(() => {
  carregar();
}, []);
const labels =
  faturas
    .slice()
    .reverse()
    .map((f) =>
      f.referencia?.split('/')[0]
    );

const economias =
  faturas
    .slice()
    .reverse()
    .map(
      (f) => Number(f.economia)
    );
return (
  <ImageBackground
  source={require('../../assets/images/background.png')}
  resizeMode="cover"
  style={{
    flex: 1,
    paddingTop: 70,
  }}
>
 <ScrollView
  contentContainerStyle={{
    padding: 16,
  }}
>
    <View
      style={{
       backgroundColor: 'rgba(250,204,21,0.65)',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: 'bold',
        }}
      >
        Economia acumulada
      </Text>

      <Text
        style={{
          fontSize: 32,
          fontWeight: 'bold',
        }}
      >
        R$ {economiaTotal.toFixed(2).replace('.', ',')}
      </Text>

     {faturas.length > 1 && (
  <View
    style={{
      alignItems: 'center',
      marginVertical: 15,
    }}
  >
   <BarChart
  data={{
    labels,
    datasets: [
      {
        data: economias,
      },
    ],
  }}
  width={Dimensions.get('window').width - 90}
  height={250}
  yAxisLabel="R$ "
  yAxisSuffix=""
  fromZero
  chartConfig={{
  backgroundColor: 'rgba(255,255,255,0.70)',
backgroundGradientFrom: 'rgba(255,255,255,0.70)',
backgroundGradientTo: 'rgba(255,255,255,0.70)',

  decimalPlaces: 0,

  color: () => '#16a34a',

  fillShadowGradient: '#16a34a',
  fillShadowGradientOpacity: 1,

  labelColor: () => '#0f172a',

  barPercentage: 0.25,
}}
/>
  </View>
)}

<Text
  style={{
    marginTop: 8,
    fontSize: 16,
  }}
>
  Última referência: {faturas[0]?.referencia || '-'}
</Text>
    </View>

    <FlatList
    scrollEnabled={false}
        data={faturas}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.80)',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: 'black',
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
            📄 {item.referencia}
            </Text>

            <Text
              style={{
                color: 'black',
              }}
            >
              Valor:
              R$ {Number(item.valor_total)
  .toFixed(2)
  .replace('.', ',')}
            </Text>
            <Text
  style={{
    color: '#22c55e',
    fontWeight: 'bold',
  }}
>
  Economia:
  R$ {Number(item.economia)
  .toFixed(2)
  .replace('.', ',')}
</Text>

<Text
  style={{
    color: 'black',
  }}
>
  Cliente:
  {' '}
  {item.nome_cliente}
</Text>

<Text
  style={{
    color: 'black',
  }}
>
  Vencimento:{' '}
  {item.vencimento
    ? item.vencimento
        .split('-')
        .reverse()
        .join('/')
    : '-'}
</Text>

            <Text
  style={{
    color: 'black',
  }}
>
  Instalação: {item.numero_instalacao}
</Text>

<TouchableOpacity
  onPress={() =>
    excluirFatura(item.id)
  }
  style={{
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  }}
>
  <Text
    style={{
      color: 'black',
      textAlign: 'center',
      fontWeight: 'bold',
    }}
  >
    EXCLUIR FATURA
  </Text>
</TouchableOpacity>
          </View>
        )}
      />
      </ScrollView>
</ImageBackground>
  );
}

