import { router } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../supabase';

export default function NovaUsina() {
  const [nome, setNome] = useState('');
  const [pontoInstalacao, setPontoInstalacao] =
    useState('');
  const [potencia, setPotencia] =
    useState('');
  const [geracaoMedia, setGeracaoMedia] =
    useState('');
  const [investimento, setInvestimento] =
    useState('');

  async function salvar() {
    const { error } = await supabase
      .from('usinas')
      .insert({
        nome,
        ponto_instalacao:
          pontoInstalacao,
        potencia_kwp:
          Number(potencia),
        geracao_media:
          Number(geracaoMedia),
        investimento:
          Number(investimento),
      });

    if (error) {
      console.log(
        'ERRO AO CRIAR USINA:',
        error
      );
      return;
    }

    router.back();
  }

 return (
  <ImageBackground
source={require('../../assets/images/background.png')}    style={{ flex: 1 }}
  >
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
        }}
      >
         <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 18,
          padding: 20,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 6,
        }}
      >

      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        Nova Usina
      </Text>

      <Text>Nome</Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        style={styles.input}
        
      />

      <Text>Ponto de Instalação</Text>
      <TextInput
        value={pontoInstalacao}
        onChangeText={(texto) =>
          setPontoInstalacao(
            texto.replace(/\D/g, '')
          )
        }
        keyboardType="numeric"
        style={styles.input}
      />

      <Text>Potência (kWp)</Text>
      <TextInput
        value={potencia}
        onChangeText={setPotencia}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text>Geração Média (kWh/mês)</Text>
      <TextInput
        value={geracaoMedia}
        onChangeText={setGeracaoMedia}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text>Investimento</Text>
      <TextInput
        value={investimento}
        onChangeText={setInvestimento}
        keyboardType="numeric"
        style={styles.input}
      />

      <TouchableOpacity
        onPress={salvar}
        style={{
          backgroundColor: '#16a34a',
          padding: 15,
          borderRadius: 10,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: 'white',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          SALVAR USINA
          
        </Text>
      </TouchableOpacity>
            </View>
            
    </ScrollView>
      </SafeAreaView>
  </ImageBackground>
);
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    marginBottom: 18,
  },
};