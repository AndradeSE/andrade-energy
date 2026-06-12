import { useEffect, useState } from 'react';
import {
  ImageBackground, Text,
  View
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
  <ImageBackground
    source={require('../../assets/images/background.png')}
    resizeMode="cover"
    style={{
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 70,
}}
  >

    <View
  style={{
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  }}
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding: 15,
      borderRadius: 16,
    }}
  >
    <Text
      style={{
        color: '#334155',
        fontSize: 14,
      }}
    >
      Clientes
    </Text>

    <Text
      style={{
        color: '#0f172a',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 5,
      }}
    >
      {clientes}
    </Text>
  </View>

  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.85)',
      padding: 15,
      borderRadius: 16,
    }}
  >
    <Text
      style={{
        color: '#334155',
        fontSize: 14,
      }}
    >
      Faturas
    </Text>

    <Text
      style={{
        color: '#0f172a',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 5,
      }}
    >
      {faturas}
    </Text>
  </View>
</View>

<View
  style={{
    backgroundColor: 'rgba(20,83,45,0.90)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
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
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 8,
    }}
  >
    R$ {economiaTotal.toFixed(2)}
  </Text>
  </View>
  
<View
  style={{
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  }}
>
  <Text
    style={{
      color: '#facc15',
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
    }}
  >
    Últimas Faturas
  </Text>
</View>

    <View
      style={{
        backgroundColor: 'rgba(15,23,42,0.65)',
        padding: 15,
        borderRadius: 12,
      }}
    >
      {ultimasFaturas.map((item) => (
  <View
    key={item.id}
    style={{
      backgroundColor: 'rgba(15,23,42,0.75)',
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
    
      
  </ImageBackground>
);

}