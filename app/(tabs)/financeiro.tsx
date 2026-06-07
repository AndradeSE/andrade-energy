import { useEffect, useState } from 'react';
import {
  Text,
  View,
} from 'react-native';

import { supabase } from '../../supabase';

export default function Financeiro() {
  const [economia, setEconomia] =
    useState(0);

  const [valorTotal, setValorTotal] =
    useState(0);

  const [quantidade, setQuantidade] =
    useState(0);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } =
      await supabase
        .from('faturas')
        .select('*');

    const lista = data || [];

    setQuantidade(
      lista.length
    );

    setEconomia(
      lista.reduce(
        (acc, item) =>
          acc +
          Number(item.economia || 0),
        0
      )
    );

    setValorTotal(
      lista.reduce(
        (acc, item) =>
          acc +
          Number(item.valor_total || 0),
        0
      )
    );
  }

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
          backgroundColor: '#0f172a',
          padding: 20,
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
          Economia acumulada
        </Text>

        <Text
          style={{
            color: '#22c55e',
            fontSize: 32,
            fontWeight: 'bold',
          }}
        >
          R$ {economia.toFixed(2)}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#0f172a',
          padding: 20,
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: 'white',
          }}
        >
          Valor total das contas
        </Text>

        <Text
          style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 'bold',
          }}
        >
          R$ {valorTotal.toFixed(2)}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#0f172a',
          padding: 20,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: 'white',
          }}
        >
          Faturas processadas
        </Text>

        <Text
          style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 'bold',
          }}
        >
          {quantidade}
        </Text>
      </View>
    </View>
  );
}