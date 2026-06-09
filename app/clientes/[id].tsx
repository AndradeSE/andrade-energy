import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    Text,
    View,
} from 'react-native';

import { supabase } from '../../supabase';

export default function ClienteDetalhe() {
  const { id } = useLocalSearchParams();

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
  }

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
    </ScrollView>
  );
}