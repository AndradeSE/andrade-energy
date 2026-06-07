import { useEffect, useState } from 'react';
import {
  Text,
  View,
} from 'react-native';

import { supabase } from '../../supabase';

export default function Financeiro() {
  const [clientes, setClientes] =
  
  useState(0);
  
 const [economia, setEconomia] =
    useState(0);

  const [valorTotal, setValorTotal] =
    useState(0);

  const [quantidade, setQuantidade] =
    useState(0);

    const [ranking, setRanking] =
  useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
const { data: listaClientes } =
  await supabase
    .from('clientes')
    .select('*');

setClientes(
  listaClientes?.length || 0
);

const { data } =
  await supabase
    .from('faturas')
    .select('*');

const lista = data || [];


const rankingClientes =
  listaClientes?.map(
    (cliente: any) => ({
      nome: cliente.nome,
      economia: lista
        .filter(
          (f) =>
            f.numero_instalacao
              ?.replace(/\D/g, '') ===
            cliente.uc
              ?.replace(/\D/g, '')
        )
        .reduce(
          (acc, item) =>
            acc +
            Number(item.economia || 0),
          0
        ),
    })
  ) || [];

rankingClientes.sort(
  (a, b) =>
    b.economia - a.economia
);

setRanking(rankingClientes);
    
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
          R$ {economia
  .toFixed(2)
  .replace('.', ',')}
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
      color: '#facc15',
      fontSize: 28,
      fontWeight: 'bold',
    }}
  >
    R$ {valorTotal
      .toFixed(2)
      .replace('.', ',')}
  </Text>
</View>

 <View
  style={{
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  }}
>
  <View style={{ alignItems: 'center' }}>
    <Text style={{ color: 'white' }}>
      Clientes
    </Text>

    <Text
      style={{
        color: '#facc15',
        fontSize: 32,
        fontWeight: 'bold',
      }}
    >
      {clientes}
    </Text>
  </View>

  <View style={{ alignItems: 'center' }}>
    <Text style={{ color: 'white' }}>
      Faturas
    </Text>

    <Text
      style={{
        color: '#facc15',
        fontSize: 32,
        fontWeight: 'bold',
      }}
    >
      {quantidade}
    </Text>
  </View>
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
      color: '#facc15',
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    }}
  >
    🏆 Top Clientes
  </Text>

  {ranking.map((cliente, index) => (
    <View
      key={index}
      style={{
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {index + 1}º {cliente.nome}
      </Text>

      <Text
        style={{
          color: '#22c55e',
        }}
      >
        R$ {cliente.economia
          .toFixed(2)
          .replace('.', ',')}
      </Text>
    </View>
  ))}
</View>
</View>
  );
}