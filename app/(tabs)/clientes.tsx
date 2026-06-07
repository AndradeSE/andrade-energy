import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
  const [distribuidora, setDistribuidora] = useState('');
  const [telefone, setTelefone] = useState('');
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
  

  async function salvarCliente() {
    if (!nome || !uc) {
      Alert.alert('Atenção', 'Preencha Nome e UC');
      return;
    }

    const { error } = await supabase
      .from('clientes')
      .insert([
        {
          nome,
          uc,
          distribuidora,
          telefone,
        },
      ]);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    Alert.alert('Sucesso', 'Cliente cadastrado');

    setNome('');
    setUc('');
    setDistribuidora('');
    setTelefone('');

    carregarClientes();
  }

  useEffect(() => {
    carregarClientes();
  }, []);
function economiaCliente(clienteId: string) {
  console.log('CLIENTE', clienteId);
  console.log('FATURAS', faturas);

  return faturas
    .filter(
      (f) => f.cliente_id === clienteId
    )
    .reduce(
      (acc, item) =>
        acc + Number(item.economia || 0),
      0
    );
}
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
          SALVAR CLIENTE
        </Text>
      </TouchableOpacity>

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
        data={clientes}
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
  <Text
    style={{
      color: '#facc15',
      fontWeight: 'bold',
      fontSize: 18,
    }}
  >
    {item.nome}
  </Text>

  <Text style={{ color: 'white' }}>
    UC: {item.uc}
  </Text>

  <Text style={{ color: 'white' }}>
    {item.distribuidora}
  </Text>

  <Text style={{ color: '#94a3b8' }}>
    {item.telefone}
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
  R$ {economiaCliente(item.id).toFixed(2)}
</Text>
</View>
        )}
      />
    </ScrollView>
  );
}