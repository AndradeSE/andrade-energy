import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../../supabase';

export default function ClienteDetalhe() {
  const { id } = useLocalSearchParams();

  const [faturas, setFaturas] =
  useState<any[]>([]);

  const [cliente, setCliente] =
    useState<any>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

   
    const { data } =
      await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

    setCliente(data);
    console.log('CLIENTE', data);
  

  const { data: listaFaturas } =
  await supabase
    .from('faturas')
    .select('*');

console.log(
  'TODAS FATURAS:',
  listaFaturas
);

console.log(
  'UC CLIENTE:',
  data?.uc
);

console.log(
  'FATURAS:',
  listaFaturas
);
const faturasCliente =
  (listaFaturas || []).filter(
    (f) =>
      String(f.numero_instalacao)
        .replace(/\D/g, '') ===
      String(data?.uc)
        .replace(/\D/g, '')
  );

console.log(
  'FATURAS FILTRADAS:',
  faturasCliente
);


setFaturas(faturasCliente);
console.log(
  'FATURAS FILTRADAS:',
  faturasCliente
);

console.log(
  'QUANTIDADE FINAL:',
  faturasCliente.length
);
}
const economiaTotal = faturas.reduce(
  (acc, item) =>
    acc + Number(item.economia || 0),
  0
);


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

  console.log('TELA DETALHE CARREGADA');

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#020617',
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

        <View
  style={{
    backgroundColor: '#facc15',
    padding: 20,
    borderRadius: 12,
    marginTop: 15,
  }}
>
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
  );
}