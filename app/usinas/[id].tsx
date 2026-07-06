import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text, TouchableOpacity, View
} from 'react-native';

import { supabase } from '../../supabase';

export default function DetalheUsina() {

  const { id } = useLocalSearchParams();

const usinaId = Array.isArray(id)
  ? id[0]
  : id;

const [usina, setUsina] =
  useState<any>(null);

const [clientes, setClientes] =
  useState<any[]>([]);

const [ocupacao, setOcupacao] =
  useState(0);

  const [faturas, setFaturas] =
  useState<any[]>([]);

  useEffect(() => {
  carregar();
}, []);

async function carregar() {

  const { data: usinaData } =
    await supabase
      .from('usinas')
      .select('*')
      .eq('id', usinaId)
      .single();

  setUsina(usinaData);

  const { data: clientesData } =
    await supabase
      .from('clientes')
      .select('*')
      .eq('usina_id', usinaId);

  setClientes(clientesData || []);

  const { data: listaFaturas } =
  await supabase
    .from('faturas')
    .select('*');

setFaturas(listaFaturas || []);

  let consumoTotal = 0;

  clientesData?.forEach(cliente => {

    const ultima =
      faturas
        ?.filter(
          f =>
            f.numero_instalacao ===
            cliente.uc
        )
        .sort(
          (a, b) =>
            b.id.localeCompare(a.id)
        )[0];

    consumoTotal += Number(
      ultima?.consumo_kwh || 0
    );

  });

  if (
    usinaData?.geracao_media > 0
  ) {

    setOcupacao(
      (
        consumoTotal /
        usinaData.geracao_media
      ) * 100
    );
    }
}


    return (

<ImageBackground
  source={require('../../assets/images/background.png')}
  resizeMode="cover"
  style={{
    flex:1
  }}
>

<ScrollView
  contentContainerStyle={{
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  }}
>
 <Text
  style={{
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  }}
>
  Clientes vinculados
</Text>

{clientes.length===0 && (

<View
style={{
backgroundColor:'black',
padding:20,
borderRadius:12
}}
>

<Text>

Nenhum cliente vinculado.

</Text>

</View>

)}

{clientes.map(cliente => {

  const ultimaFatura =
    faturas?.find(
      f => f.numero_instalacao === cliente.uc
    );

  const ocupacao =
    usina?.geracao_media
      ? (
          (Number(
            ultimaFatura?.consumo_kwh || 0
          ) /
            usina.geracao_media) *
          100
        ).toFixed(2)
      : '0.00';

  return (

<TouchableOpacity
  key={cliente.id}
  onPress={() =>
    router.push({
      pathname: '/clientes/[id]',
      params: {
        id: cliente.id,
      },
    })
  }
  style={{
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  }}
>

<Text
style={{
fontWeight:'bold',
fontSize:18
}}
>

{cliente.nome}

</Text>


<Text>

⚡ UC:

{cliente.uc}

</Text>

<Text>
📍 {cliente.endereco}
</Text>

<Text>
{cliente.cidade} - {cliente.estado}
</Text>

<Text
  style={{
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 4,
  }}
>
  🏷️ Desconto: {cliente.percentual_desconto || 40}%
</Text>

<Text
  style={{
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
  }}
>
  📈 Ocupação: {ocupacao}%
</Text>

</TouchableOpacity>

);
})}

</ScrollView>

</ImageBackground>

  );

}