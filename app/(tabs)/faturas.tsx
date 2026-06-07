import { useEffect, useState } from 'react';
import {
    Dimensions, FlatList,
    Text,
    View
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
      .select('*')
      .order('created_at', {
        ascending: false,
      });

  const lista = data || [];

  setFaturas(lista);

  const total =
    lista.reduce(
      (acc, item) =>
        acc +
        Number(item.economia || 0),
      0
    );

  setEconomiaTotal(total);
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

      <Text
        style={{
          marginTop: 8,
          fontSize: 16,
        }}
      >
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
        Última referência: {faturas[0]?.referencia || '-'}
      </Text>
    </View>

    <LineChart
      data={{
        labels,
        datasets: [
          {
            data:
              economias.length > 0
                ? economias
                : [0],
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
          </View>
        )}
      />
    </View>
  );
}