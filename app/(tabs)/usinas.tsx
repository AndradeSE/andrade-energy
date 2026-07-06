import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extrairDadosCemig } from '../../services/extrairCemig';
import { lerFaturaOCR } from '../../services/ocr';

import { supabase } from '../../supabase';

import { listarUsinas } from '../../services/usinas.service';


export default function Usinas() {
  const [usinas, setUsinas] =
    useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

    async function carregar() {
     console.log('listarUsinas:', listarUsinas); 

  const { data: faturas } =
    await supabase
      .from('faturas')
      .select('*');

  const data =
await listarUsinas();

  const { data: clientes } =
    await supabase
      .from('clientes')
      .select('*');

  const usinasComClientes =
    (data || []).map((usina) => {

      const clientesUsina =
        clientes?.filter(
          c => c.usina_id === usina.id
        ) || [];

      const consumoTotal =
        clientesUsina.reduce(
          (acc, cliente) => {

            const faturasCliente =
              (faturas || []).filter(
                f =>
                  f.numero_instalacao
                    ?.replace(/\D/g, '') ===
                  cliente.uc
                    ?.replace(/\D/g, '')
              );

            const consumoCliente =
              faturasCliente.reduce(
                (soma, f) =>
                  soma +
                  Number(f.consumo_kwh || 0),
                0
              );

            return acc + consumoCliente;

          },
          0
        );

      return {
        ...usina,
        clientes: clientesUsina,
        consumoTotal,
      };

    });

  setUsinas(usinasComClientes);

}  

    async function importarViaFatura() {

  const resultado =
    await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

  if (resultado.canceled) return;

  const arquivo = resultado.assets[0];

  const base64 =
    await FileSystem.readAsStringAsync(
      arquivo.uri,
      {
        encoding: 'base64' as any,
      }
    );

  const bytes = Uint8Array.from(
    atob(base64),
    c => c.charCodeAt(0)
  );

  const nomeArquivo =
    Date.now() + '-' + arquivo.name;

  const { error: uploadError } =
    await supabase.storage
      .from('usinas')
      .upload(nomeArquivo, bytes, {
        contentType: 'application/pdf',
      });

  if (uploadError) {
    Alert.alert(
      'Erro',
      uploadError.message
    );
    return;
  }

  const { data } =
    supabase.storage
      .from('usinas')
      .getPublicUrl(nomeArquivo);

  const resultadoOCR =
    await lerFaturaOCR(
      data.publicUrl
    );

  const textoOCR =
    resultadoOCR
      .ParsedResults?.[0]
      ?.ParsedText || '';

  const dados =
    extrairDadosCemig(textoOCR);

  const pontoInstalacao =
    String(
      dados.numero_instalacao
    ).replace(/\D/g, '');

  const { data: existente } =
    await supabase
      .from('usinas')
      .select('id')
      .eq(
        'ponto_instalacao',
        pontoInstalacao
      )
      .maybeSingle();

  if (existente) {

    Alert.alert(
      'Usina já cadastrada'
    );

    return;

  }

  const { error } =
    await supabase
      .from('usinas')
      .insert({

        nome:
          `UFV ${dados.cidade || ''}`,

        ponto_instalacao:
          pontoInstalacao,

        potencia_kwp:0,

        geracao_media:0,

        investimento:0,

      });

  if (error) {

    Alert.alert(
      'Erro',
      error.message
    );

    return;

  }

  Alert.alert(
    'Sucesso',
    'Usina importada.'
  );

  carregar();

}
  
return (
  <ImageBackground
source={require('../../assets/images/background.png')}    style={{
      flex: 1,
    }}
  >
   <SafeAreaView
  style={{
    flex: 1,
    padding: 16,
  }}
>
   <View
  style={{
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  }}
>
  <TouchableOpacity
    onPress={() =>
      router.push('/usinas/nova')
    }
    style={{
      flex: 1,
      backgroundColor: '#16a34a',
      padding: 14,
      borderRadius: 10,
    }}
  >
    <Text
      style={{
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
      }}
    >
      ➕ NOVA USINA
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
  onPress={importarViaFatura}
  style={{
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
  }}
>
    <Text
      style={{
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
      }}
    >
     ➕ 📄 VIA FATURA
    </Text>
  </TouchableOpacity>
</View>
  
 <ScrollView
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 40,
  }}
>
        
 

     
      {usinas.map((usina) => {

        const energiaDisponivel =
  usina.geracao_media -
  usina.consumoTotal;

  const ocupacao =
  usina.geracao_media > 0
    ? (
        usina.consumoTotal /
        usina.geracao_media
      ) * 100
    : 0;

  const receitaMensal =
    usina.clientes.length * 50;

  return (

    
  <TouchableOpacity
  key={usina.id}
  onPress={() => router.push(`/usinas/${usina.id}`)}
  style={{
    backgroundColor: 'rgba(255,255,255,0.80)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  }}
>
         <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
  {usina.nome}
</Text>

<Text>
  🔌 Ponto de instalação: {usina.ponto_instalacao || '-'}
</Text>

<Text>
  👥 Clientes: {usina.clientes.length}
</Text>

<Text>
  ⚡ Potência: {usina.potencia_kwp} kWp
</Text>

<Text>
  🌞 Geração média: {usina.geracao_media} kWh/mês
</Text>

<Text>
  ⚡ Consumo alocado: {usina.consumoTotal} kWh
</Text>

<Text>
  📈 Ocupação: {ocupacao.toFixed(1)}%
</Text>

<Text>
  🔋 Disponível: {energiaDisponivel} kWh
</Text>

<Text>
  💰 Receita mensal: R$ {receitaMensal
    .toFixed(2)
    .replace('.', ',')}
</Text>

<Text>
  🏗️ Investimento: R$ {Number(usina.investimento || 0)
    .toFixed(2)
    .replace('.', ',')}
</Text>

<TouchableOpacity
  onPress={() =>
    router.push({
      pathname: '/usinas/editar',
      params: {
        id: usina.id,
      },
    })
  }
  style={{
    backgroundColor: '#2563eb',
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
    EDITAR USINA
  </Text>
</TouchableOpacity>


</TouchableOpacity>
      );
})}
</ScrollView>
      
        </SafeAreaView>
        
        
</ImageBackground>
);
}