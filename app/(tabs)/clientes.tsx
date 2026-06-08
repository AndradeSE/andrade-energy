import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../supabase';


export default function Clientes() {
  const [nome, setNome] = useState('');
  const [uc, setUc] = useState('');
  const [editando, setEditando] =
  useState<any>(null);
  const [distribuidora, setDistribuidora] = useState('');
  const [telefone, setTelefone] = useState('');
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);

  async function carregarClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
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
  setEditando(cliente);

  setNome(cliente.nome);
  setUc(cliente.uc);
  setDistribuidora(
    cliente.distribuidora
  );
  setTelefone(
    cliente.telefone
  );
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
        },
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
    setEditando(null);

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
          const { error } =
            await supabase
              .from('clientes')
              .delete()
              .eq('id', id);

          if (error) {
            Alert.alert(
              'Erro',
              error.message
            );
            return;
          }

          carregarClientes();
        },
      },
    ]
  );
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
        backgroundColor: '#020617',
      }}
      contentContainerStyle={{
        padding: 20,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          color: '#facc15',
          fontSize: 30,
          fontWeight: '900',
          marginTop: 40,
          marginBottom: 20,
        }}
      >
        Clientes
      </Text>

      <TextInput
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
        style={{
          backgroundColor: 'white',
          padding: 15,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      <TextInput
        placeholder="UC"
        value={uc}
        onChangeText={setUc}
        style={{
          backgroundColor: 'white',
          padding: 15,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      <TextInput
        placeholder="Distribuidora"
        value={distribuidora}
        onChangeText={setDistribuidora}
        style={{
          backgroundColor: 'white',
          padding: 15,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      <TextInput
        placeholder="Telefone"
        value={telefone}
        onChangeText={setTelefone}
        style={{
          backgroundColor: 'white',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      />
      

      <TouchableOpacity
        onPress={salvarCliente}
        style={{
          backgroundColor: '#facc15',
          padding: 18,
          borderRadius: 12,
          marginBottom: 30,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
        {editando
  ? 'ATUALIZAR CLIENTE'
  : 'SALVAR CLIENTE'}
        </Text>
      </TouchableOpacity>
      <TextInput
  placeholder="🔍 Buscar cliente"
  value={busca}
  onChangeText={setBusca}
  style={{
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  }}
/>

      <Text
        style={{
          color: 'white',
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 10,
        }}
      >
        Clientes Cadastrados
      </Text>

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
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  }}
>
  
   <TouchableOpacity
  onPress={() =>
  router.push(`/clientes/${item.id}`)
}

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

    <Text style={{ color: '#cbd5e1' }}>
      🏢 {item.distribuidora}
    </Text>

    <Text style={{ color: '#94a3b8' }}>
      📞 {item.telefone}
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
    editarCliente(item)
  }
  style={{
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  }}
>
  <Text
    style={{
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
    }}
  >
    EDITAR CLIENTE
  </Text>
</TouchableOpacity>

        <TouchableOpacity
      onPress={() =>
        excluirCliente(item.id)
      }
      style={{
        backgroundColor: '#dc2626',
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
        EXCLUIR CLIENTE
      </Text>
    </TouchableOpacity>

  </View>
)}
      />
    </ScrollView>
  </KeyboardAvoidingView>
);
}