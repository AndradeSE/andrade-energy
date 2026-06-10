import { useEffect, useState } from 'react';

import {
  Alert,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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
    .map(
      (f) => f.referencia
    );

const economias =
  faturas
    .slice()
    .reverse()
    .map(
      (f) => Number(f.economia)
    );
return (
  <View
    style={{
      flex: 1,
      backgroundColor: '#020617',
      padding: 16,
    }}
  >
    <View
      style={{
        backgroundColor: '#facc15',
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
  <LineChart
    data={{
      labels,
      datasets: [
        {
          data: economias,
        },
      ],
    }}
    width={
      Dimensions.get('window').width - 32
    }
    height={220}
    chartConfig={{
      backgroundColor: '#0f172a',
      backgroundGradientFrom: '#0f172a',
      backgroundGradientTo: '#0f172a',
      decimalPlaces: 2,
      color: (opacity = 1) =>
        `rgba(250,204,21,${opacity})`,
      labelColor: (opacity = 1) =>
        `rgba(255,255,255,${opacity})`,
    }}
    bezier
    style={{
      borderRadius: 12,
      marginBottom: 20,
    }}
  />
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
        data={faturas}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor:
                '#0f172a',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
            📄 {item.referencia}
            </Text>

            <Text
              style={{
                color: 'white',
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
    color: 'white',
  }}
>
  Cliente:
  {' '}
  {item.nome_cliente}
</Text>

<Text
  style={{
    color: 'white',
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
    color: 'white',
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
      color: 'white',
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
    </View>
  );
}

