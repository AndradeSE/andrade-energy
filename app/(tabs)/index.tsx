import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../supabase';

export default function Dashboard() {
  const [clientes, setClientes] = useState(0);
  const [faturas, setFaturas] = useState(0);
  const [economiaTotal, setEconomiaTotal] = useState(0);
  const [ultimasFaturas, setUltimasFaturas] = useState<any[]>([]);

 async function carregarDados() {

  const { count: totalClientes } =
    await supabase
      .from('clientes')
      .select('*', {
        count: 'exact',
        head: true,
      });

  const { count: totalFaturas } =
    await supabase
      .from('faturas')
      .select('*', {
        count: 'exact',
        head: true,
      });


  const { data: listaEconomias } =
    await supabase
      .from('faturas')
      .select('economia');

  const totalEconomia =
    listaEconomias?.reduce(
      (acc, item) =>
        acc + Number(item.economia || 0),
      0
    ) || 0;

    const { data: ultimas } = await supabase
  .from('faturas')
  .select('*')
  .order('created_at', {
    ascending: false,
  })
  .limit(5);

setUltimasFaturas(ultimas || []);
  setEconomiaTotal(totalEconomia);

  setClientes(totalClientes || 0);
  setFaturas(totalFaturas || 0);
}

  useEffect(() => {
    carregarDados();
  }, []);

  return (
  <ScrollView
    style={{
      flex: 1,
      backgroundColor: '#020617',
    }}
    contentContainerStyle={{
      padding: 20,
      paddingTop: 60,
    }}
  >
    <Text
      style={{
        color: '#facc15',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 30,
      }}
    >
      Andrade Energy
    </Text>

    <View
      style={{
        backgroundColor: '#0f172a',
        padding: 20,
        borderRadius: 16,
        marginBottom: 15,
      }}
    >
      <Text
        style={{
          color: '#94a3b8',
          fontSize: 16,
        }}
      >
        Clientes
      </Text>

      <Text
        style={{
          color: 'white',
          fontSize: 32,
          fontWeight: 'bold',
          marginTop: 10,
        }}
      >
        {clientes}
      </Text>
    </View>

    <View
      style={{
        backgroundColor: '#0f172a',
        padding: 20,
        borderRadius: 16,
        marginBottom: 15,
      }}
    >
      <Text
        style={{
          color: '#94a3b8',
          fontSize: 16,
        }}
      >
        Faturas
      </Text>

      <Text
        style={{
          color: 'white',
          fontSize: 32,
          fontWeight: 'bold',
          marginTop: 10,
        }}
      >
        {faturas}
      </Text>
    </View>

    <View
      style={{
        backgroundColor: '#14532d',
        padding: 20,
        borderRadius: 16,
        marginBottom: 25,
      }}
    >
      <Text
        style={{
          color: '#bbf7d0',
          fontSize: 16,
        }}
      >
        Economia Acumulada
      </Text>

      <Text
        style={{
          color: 'white',
          fontSize: 30,
          fontWeight: 'bold',
          marginTop: 10,
        }}
      >
        R$ {economiaTotal.toFixed(2)}
      </Text>
    </View>

    <Text
      style={{
        color: '#facc15',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
      }}
    >
      Últimas Faturas
    </Text>

    <View
      style={{
        backgroundColor: '#0f172a',
        padding: 15,
        borderRadius: 12,
      }}
    >
      {ultimasFaturas.map((item) => (
  <View
    key={item.id}
    style={{
      backgroundColor: '#0f172a',
      padding: 12,
      borderRadius: 10,
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      {item.referencia}
    </Text>

    <Text
      style={{
        color: '#22c55e',
      }}
    >
      Economia: R$ {Number(item.economia).toFixed(2)}
    </Text>
  </View>
))}
    </View>
  </ScrollView>
);
}