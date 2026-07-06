import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../supabase';

import { extrairDadosCemig } from '../../services/extrairCemig';
import { lerFaturaOCR } from '../../services/ocr';

export default function Clientes() {
  const [cpf, setCpf] =
  useState('');
const [endereco, setEndereco] =
  useState('');
  const [nome, setNome] = useState('');
  const [uc, setUc] = useState('');
  const [editando, setEditando] =
  useState<any>(null);
  const [distribuidora, setDistribuidora] = useState('');
  const [telefone, setTelefone] = useState('');
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [usinas, setUsinas] =
  useState<any[]>([]);
  const [usinaId, setUsinaId] =
  useState('');
  

  async function carregarClientes() {
    const { data: listaUsinas } =
  await supabase
    .from('usinas')
    .select('*')
    .order('nome');

setUsinas(listaUsinas || []);


   const { data, error } = await supabase
  .from('clientes')
  .select(`
    *,
    usinas (
      nome
    )
  `)
  .order('nome');

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    

    setClientes(data || []);
  const { data: listaFaturas } =
  await supabase
    .from('faturas')
    .select('*');

setFaturas(listaFaturas || []);
  }
  function editarCliente(cliente: any) {
    setUsinaId(
  cliente.usina_id || ''
);
  setEditando(cliente);

  setNome(cliente.nome);
  setUc(cliente.uc);
  setDistribuidora(
    cliente.distribuidora
  );
  setTelefone(
    cliente.telefone
  );
  setCpf(cliente.cpf || '');
setEndereco(cliente.endereco || '');
}
  

  async function salvarCliente() {
    if (!nome || !uc) {
      Alert.alert('Atenção', 'Preencha Nome e UC');
      return;
    }

    let error;

if (editando) {
  const resultado =
    await supabase
      .from('clientes')
      .update({
        nome,
        uc: uc.replace(/\D/g, ''),
        distribuidora,
        telefone,
        cpf,
        endereco,
        usina_id: usinaId,
      })
      .eq('id', editando.id);

  error = resultado.error;
} else {
  const resultado =
    await supabase
      .from('clientes')
      .insert([
       {
  nome,
   uc: uc.replace(/\D/g, ''),
  distribuidora,
  telefone,
  cpf,
  endereco,
  usina_id: usinaId,
}
      ]);

  error = resultado.error;
}
if (error) {
  Alert.alert(
    'Erro',
    error.message
  );
  return;
}

    Alert.alert('Sucesso', 'Cliente cadastrado');

    setNome('');
    setUc('');
    setDistribuidora('');
    setTelefone('');
    setCpf('');
    setEndereco('');
    setEditando(null);
    setUsinaId('');

    carregarClientes();
  }
async function excluirCliente(id: string) {
  console.log('CLICOU', id);
  Alert.alert(
    'Excluir Cliente',
    'Deseja realmente excluir este cliente?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        style: 'destructive',
       onPress: async () => {
  // Excluir cobranças
  const { error: cobrancasError } =
    await supabase
      .from('cobrancas')
      .delete()
      .eq('cliente_id', id);

  if (cobrancasError) {
    Alert.alert(
      'Erro',
      cobrancasError.message
    );
    return;
  }

  // Excluir faturas
  const { error: faturasError } =
    await supabase
      .from('faturas')
      .delete()
      .eq('cliente_id', id);

  if (faturasError) {
    Alert.alert(
      'Erro',
      faturasError.message
    );
    return;
  }

  // Excluir cliente
  const { error: clienteError } =
    await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

  if (clienteError) {
    Alert.alert(
      'Erro',
      clienteError.message
    );
    return;
  }

  Alert.alert(
    'Sucesso',
    'Cliente excluído com sucesso'
  );

  carregarClientes();
}
      },
    ]
  );
}
async function importarViaFatura() {

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

    const bytes = Uint8Array.from(
      atob(base64),
      c => c.charCodeAt(0)
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
        .getPublicUrl(
          nomeArquivo
        );

    const arquivoUrl =
      urlData.publicUrl;

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

    if (

      !dados.numero_instalacao ||

      !dados.referencia ||

      !dados.valor_total

    ) {

      Alert.alert(
        'Fatura inválida',
        'Não foi possível identificar os dados da fatura.'
      );

      return;

    }

    const ucLimpa =
      String(
        dados.numero_instalacao
      ).replace(/\D/g, '');

    const { data: clienteExistente } =
      await supabase
        .from('clientes')
        .select('*')
        .eq('uc', ucLimpa)
        .maybeSingle();

    let clienteIdFinal =
      clienteExistente?.id;

    if (!clienteExistente) {

      const {

        data: novoCliente,

        error: clienteError,

      } =
        await supabase
          .from('clientes')
          .insert({

            nome:
              dados.nome_cliente,

            uc: ucLimpa,

            distribuidora:
              'CEMIG',

            telefone: '',

            cpf:
              dados.cpf,

            endereco:
              dados.endereco,

            cidade:
              dados.cidade,

            estado:
              dados.estado,

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

  Alert.alert(
    'Sucesso',
    'Cliente importado com sucesso.'
  );
  const valorTotal =
  dados.valor_total
    ? parseFloat(
        dados.valor_total
          .replace(',', '.')
          .trim()
      )
    : 0;

const economia =
  Number(
    (valorTotal * 0.4).toFixed(2)
  );

const vencimentoFormatado =
  dados.vencimento
    ? dados.vencimento
        .split('/')
        .reverse()
        .join('-')
    : null;
    const { data: faturaExistente } =
  await supabase
    .from('faturas')
    .select('id')
    .eq('numero_instalacao', ucLimpa)
    .eq('referencia', dados.referencia)
    .maybeSingle();

if (faturaExistente) {

  Alert.alert(
    'Fatura já importada',
    `A competência ${dados.referencia} já está cadastrada para este cliente.`
  );

  await carregarClientes();

  return;

}

const {
  data: faturaCriada,
  error: faturaError,
} = await supabase
  .from('faturas')
  .insert({

    cliente_id:
      clienteIdFinal,

    arquivo_url:
      arquivoUrl,

    referencia:
      dados.referencia,

    valor_total:
      valorTotal,

    economia,

    numero_instalacao:
      ucLimpa,

    nome_cliente:
      dados.nome_cliente,

    vencimento:
      vencimentoFormatado,

    consumo_kwh:
      Number(
        dados.consumo_kwh || 0
      ),

  })
  .select()
  .single();

if (
  faturaError ||
  !faturaCriada
) {

  Alert.alert(
    'Erro',
    faturaError?.message ||
      'Erro ao criar fatura'
  );

  return;

}

const percentual =
  clienteExistente
    ?.percentual_desconto || 40;

const valorCobrado =
  Number(
    (
      valorTotal *
      (1 - percentual / 100)
    ).toFixed(2)
  );

const {
  error: cobrancaError,
} = await supabase
  .from('cobrancas')
  .insert({

    cliente_id:
      clienteIdFinal,

    fatura_id:
      faturaCriada.id,

    referencia:
      dados.referencia,

    valor_original:
      valorTotal,

    percentual_desconto:
      percentual,

    valor_cobrado:
      valorCobrado,

    vencimento:
      vencimentoFormatado,

    status:
      'PENDENTE',

  });

if (cobrancaError) {

  Alert.alert(
    'Erro Cobrança',
    cobrancaError.message
  );

  return;

}

Alert.alert(
  'Sucesso',
  'Cliente importado com sucesso.'
);

await carregarClientes();

} catch (erro: any) {

  Alert.alert(
    'Erro',
    JSON.stringify(erro)
  );

}

  carregarClientes();

}
  useEffect(() => {
    carregarClientes();
  }, []);
  
function economiaCliente(uc: string) {
  const faturasCliente =
    faturas.filter(
      (f) =>
        f.numero_instalacao
          ?.replace(/\D/g, '') ===
        uc?.replace(/\D/g, '')
    );

  console.log('UC:', uc);
  console.log(
    'FATURAS ENCONTRADAS:',
    faturasCliente
  );

  return faturasCliente.reduce(
    (acc, item) =>
      acc + Number(item.economia || 0),
    0
  );
}
  return (
  <ImageBackground    
source={require('../../assets/images/background.png')}    resizeMode="cover"
    style={{ flex: 1 }}
  >
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={
      Platform.OS === 'ios'
        ? 'padding'
        : 'height'
    }
  >
    <ScrollView
     style={{
  flex: 1,
}}
      contentContainerStyle={{
  paddingHorizontal: 20,
  paddingTop: 55,
  paddingBottom: 20,
}}
      keyboardShouldPersistTaps="handled"
    >
   

      <TextInput
  placeholder="🔍 Buscar cliente"
  value={busca}
  onChangeText={setBusca}
  style={{
 backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  }}
/>
<View
  style={{
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  }}
>
  <TouchableOpacity
    onPress={() =>
      router.push('/clientes/novo')
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
      ➕ NOVO CLIENTE
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
    ➕ VIA FATURA
  </Text>
</TouchableOpacity>
</View>

      <FlatList
        scrollEnabled={false}
    data={
  clientes.filter((cliente) =>
    cliente.nome
      ?.toLowerCase()
      .includes(
        busca.toLowerCase()
      )
  )
}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
  style={{
    backgroundColor: 'rgba(15,23,42,0.75)',
borderWidth: 1,
borderColor: 'rgba(250,204,21,0.2)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  }}
>
  
   <TouchableOpacity
  onPress={() => router.push(`/clientes/${item.id}`)}

>
    <Text
      style={{
        color: '#facc15',
        fontWeight: 'bold',
        fontSize: 18,
      }}
    >
      {item.nome}
    </Text>

  </TouchableOpacity>

    <Text style={{ color: '#cbd5e1', marginTop: 6 }}>
  ⚡ UC: {item.uc}
</Text>

<Text style={{ color: '#60a5fa' }}>
  ☀️ {item.usinas?.nome || 'Sem usina'}
</Text>

<Text style={{ color: '#94a3b8' }}>
  📞 {item.telefone || '-'}
</Text>

<Text style={{ color: '#94a3b8' }}>
  🪪 CPF: {item.cpf || '-'}
</Text>

<Text style={{ color: '#94a3b8' }}>
  📍 {item.endereco || '-'}
</Text>

    <Text
      style={{
        color: '#22c55e',
        marginTop: 10,
        fontWeight: 'bold',
      }}
    >
      Economia acumulada
    </Text>
    

    <Text
      style={{
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
      }}
    >
      R$ {economiaCliente(item.uc)
        .toFixed(2)
        .replace('.', ',')}
    </Text>

    <Text
      style={{
        color: '#94a3b8',
        marginTop: 8,
      }}
    >
      📄 Faturas: {
        faturas.filter(
          (f) =>
            f.numero_instalacao
              ?.replace(/\D/g, '') ===
            item.uc?.replace(/\D/g, '')
        ).length
      }
    </Text>

    <TouchableOpacity
  onPress={() =>
    router.push({
      pathname: '/clientes/editar',
      params: {
        id: item.id,
      },
    })
  }
  style={{
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  }}
>
  <Text
    style={{
      color: '#2563eb',
      textAlign: 'center',
      fontWeight: 'bold',
    }}
  >
    EDITAR CLIENTE
  </Text>
</TouchableOpacity>

         </View>
)}
      />
    </ScrollView>
      </KeyboardAvoidingView>
  </ImageBackground>
);
}