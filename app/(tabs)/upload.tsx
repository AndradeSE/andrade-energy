import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';


import * as FileSystem from 'expo-file-system/legacy';
import {
  Alert,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { extrairDadosCemig } from '../../services/extrairCemig';
import { lerFaturaOCR } from '../../services/ocr';
import { supabase } from '../../supabase';



export default function Upload() {

  const { clienteId, uc } =
    useLocalSearchParams();

  async function selecionarPDF() {
    try {
    
      const resultado =
        await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
        });

      if (resultado.canceled) return;

      const arquivo =
        resultado.assets[0];

      const base64 =
  await FileSystem.readAsStringAsync(
    arquivo.uri,
    {
      encoding: 'base64' as any,
    }
  );


     const { data, error: listError } =
  await supabase.storage
    .from('faturas')
    .list();
      const bytes = Uint8Array.from(
  atob(base64),
  (c) => c.charCodeAt(0)
);

const nomeArquivo =
  Date.now() + '-' + arquivo.name;

const { error: uploadError } =
  await supabase.storage
    .from('faturas')
    .upload(
      nomeArquivo,
      bytes,
      {
        contentType: 'application/pdf',
      }
    );

if (uploadError) {
  Alert.alert(
    'Erro Upload',
    uploadError.message
  );
  return;
}
    
const { data: urlData } =
  supabase.storage
    .from('faturas')
    .getPublicUrl(nomeArquivo);

const arquivoUrl =
  urlData.publicUrl;

try {
  const resultadoOCR =
    await lerFaturaOCR(
      arquivoUrl
    );



const textoOCR =
  resultadoOCR
    .ParsedResults?.[0]
    ?.ParsedText || '';


  const dados =
  extrairDadosCemig(
    textoOCR
  );

const ucLimpa =
  String(
    dados.numero_instalacao
  ).replace(/\D/g, '');

const { data: clienteExistente } =
  await supabase
    .from('clientes')
    .select('*')
    .eq('uc', ucLimpa)
    .single();

let clienteIdFinal =
  clienteExistente?.id;

if (!clienteExistente) {

  const {
    data: novoCliente,
    error: clienteError,
  } = await supabase
    .from('clientes')
    .insert({
      nome: dados.nome_cliente,
      uc: ucLimpa,
      distribuidora: 'CEMIG',
      telefone: '',
    })
    .select()
    .single();

  if (clienteError) {
    Alert.alert(
      'Erro Cliente',
      clienteError.message
    );
    return;
  }

  clienteIdFinal =
    novoCliente.id;
}
 

const valorTotal =
  dados.valor_total
    ? parseFloat(
        dados.valor_total
          .replace(',', '.')
          .trim()
      )
    : null;
const economia =
  valorTotal
    ? Number(
        (valorTotal * 0.4).toFixed(2)
      )
    : 0;
const vencimentoFormatado =
  dados.vencimento
    ? dados.vencimento
        .split('/')
        .reverse()
        .join('-')
    : null;


   
   const { data, error: dbError } =
  await supabase
    .from('faturas')
    .insert({
      cliente_id: clienteIdFinal,
      arquivo_url: arquivoUrl,
      referencia: dados.referencia,
      valor_total: valorTotal,
      economia: economia,
      numero_instalacao:
  ucLimpa,
      nome_cliente:
        dados.nome_cliente,
      vencimento:
        vencimentoFormatado,
    })
    .select();



if (dbError) {
  Alert.alert(
    'Erro Banco',
    JSON.stringify(dbError)
  );
  return;
}
Alert.alert(
  'Upload concluído',
  `Cliente: ${dados.nome_cliente}

Referência: ${dados.referencia}

Economia: R$ ${economia}`
);

} catch (erro: any) {
  Alert.alert(
    'ERRO OCR',
    JSON.stringify(erro)
  );
}
} catch (erro: any) {
  Alert.alert(
    'Erro',
    String(erro)
  );
}
}


  return (
    <ImageBackground
  source={require('../../assets/images/background.png')}
  resizeMode="cover"
  style={{
    flex: 1,
  }}
>
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    }}
  >
      <TouchableOpacity
        onPress={selecionarPDF}
        style={{
          backgroundColor: '#facc15',
          padding: 20,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          SELECIONAR PDF
        </Text>
      </TouchableOpacity>
    </View>
    </ImageBackground>
  );
}