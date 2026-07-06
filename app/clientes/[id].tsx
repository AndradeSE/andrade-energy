import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import AndradeBarChart from "../../components/charts/AndradeBarChart";
import {
  buscarCliente
} from '../../services/clientes.service';

import {
  buscarFaturasCliente
} from '../../services/faturas.service';

 import { Cliente } from '../../types/Cliente';

 import { Fatura } from '../../types/Fatura';



export default function ClienteDetalhe() {
  const { id } = useLocalSearchParams();

  const [cliente, setCliente] =
  useState<Cliente | null>(null);

  const [faturas, setFaturas] =
  useState<Fatura[]>([]);


  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

   
    const data =
  await buscarCliente(
    String(id)
  );

    setCliente(data);
    console.log('CLIENTE', data);
  

  const listaFaturas =
  await buscarFaturasCliente(
    data.uc
  );

setFaturas(listaFaturas);

const faturasCliente = (listaFaturas || []).filter(
  (f) =>
    String(f.numero_instalacao).replace(/\D/g, "") ===
    String(data.uc).replace(/\D/g, "")
);

setFaturas(faturasCliente);

}
const economiaTotal = faturas.reduce(
  (acc, item) =>
    acc + Number(item.economia || 0),
  0
);

const labels = faturas
  .slice()
  .reverse()
  .map((f) => f.referencia);

const economias = faturas
  .slice()
  .reverse()
  .map((f) => Number(f.economia || 0));

   const chartData = labels.map((label, index) => ({
  label,
  value: economias[index],
}));

  if (!cliente) {

   
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#020617',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white' }}>
          Carregando...
        </Text>
      </View>
    );
  }


  return (
  <ImageBackground
source={require('../../assets/images/background.png')}    style={{ flex: 1 }}
  >
    <ScrollView
      style={{
        flex: 1,
      }}
      contentContainerStyle={{
        padding: 20,
      }}
    >

      <Text
        style={{
          color: '#facc15',
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        {cliente.nome}
      
      </Text>
      <View
  style={{
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  }}
>
  <Text
    style={{
      color: 'white',
      marginBottom: 10,
    }}
  >
    ⚡ UC: {cliente.uc}
  </Text>

  <Text
    style={{
      color: 'white',
      marginBottom: 10,
    }}
  >
    🏢 {cliente.distribuidora}
  </Text>

  <Text
    style={{
      color: 'white',
    }}
  >
    📞 {cliente.telefone}
  </Text>
</View>

<TouchableOpacity
 onPress={() => {
  const telefone =
    cliente.telefone?.replace(/\D/g, '');

  const mensagem = encodeURIComponent(
    `Olá ${cliente.nome}, estou entrando em contato sobre sua economia de energia.`
  );

  Linking.openURL(
    `https://wa.me/55${telefone}?text=${mensagem}`
  );
}}
  style={{
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  }}
>
  <Text
    style={{
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
    }}
  >
    CHAMAR NO WHATSAPP
  </Text>
</TouchableOpacity>

       <View
  style={{
    backgroundColor: 'rgba(253,230,138,0.85)',
    padding: 20,
    borderRadius: 12,
    marginTop: 15,
  }}
>
  <TouchableOpacity
  onPress={() =>
    router.push(`/clientes/${cliente.id}`)}
  
  style={{
    backgroundColor: 'rgba(255,255,255,0.80)',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  }}
>
  <Text
    style={{
      textAlign: 'center',
      fontWeight: 'bold',
      color:'black',
    }}
  >
    📄 ENVIAR FATURA
  </Text>
</TouchableOpacity>

 {faturas.length > 1 && (
  <View
    style={{
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
    }}
  >
   <AndradeBarChart
  data={chartData}
  height={250}
/>
  </View>
)}


  <Text
    style={{
      fontWeight: 'bold',
      fontSize: 16,
    }}
  >
    Economia acumulada
  </Text>

  <Text
    style={{
      fontSize: 28,
      fontWeight: 'bold',
      marginTop: 8,
    }}
  >
    R$ {economiaTotal
      .toFixed(2)
      .replace('.', ',')}
  </Text>

  <Text
    style={{
      marginTop: 8,
    }}
  >
    📄 {faturas.length} faturas
  </Text>
</View>

<Text
  style={{
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  }}
>
   
  Histórico de Faturas
</Text>



{faturas.map((fatura) => (
  <View
    key={fatura.id}
    style={{
      backgroundColor: '#0f172a',
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        color: '#facc15',
        fontWeight: 'bold',
        fontSize: 16,
      }}
    >
      📄 {fatura.referencia}
    </Text>

    <Text style={{ color: 'white' }}>
      Economia: R$ {Number(fatura.economia)
        .toFixed(2)
        .replace('.', ',')}
    </Text>

    <Text style={{ color: 'white' }}>
      Valor: R$ {Number(fatura.valor_total)
        .toFixed(2)
        .replace('.', ',')}
    </Text>

    <TouchableOpacity
      onPress={() =>
        Linking.openURL(
          fatura.arquivo_url
        )
      }
      style={{
        backgroundColor: '#2563eb',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        VER PDF
        
      </Text>
    </TouchableOpacity>
  </View>
))}
        </ScrollView>
  </ImageBackground>
  );
}