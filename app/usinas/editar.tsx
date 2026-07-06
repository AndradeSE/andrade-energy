import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Alert,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { supabase } from '../../supabase';

export default function EditarUsina() {

  const { id } = useLocalSearchParams();

  const usinaId = Array.isArray(id)
    ? id[0]
    : id;

  const [nome, setNome] = useState('');
  const [pontoInstalacao, setPontoInstalacao] =
    useState('');

  const [potencia, setPotencia] =
    useState('');

  const [geracaoMedia, setGeracaoMedia] =
    useState('');

  const [investimento, setInvestimento] =
    useState('');

  const [salvando, setSalvando] =
    useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    const { data, error } =
      await supabase
        .from('usinas')
        .select('*')
        .eq('id', usinaId)
        .single();

    console.log(
      'USINA CARREGADA:',
      data
    );

    console.log(
      'ERRO:',
      error
    );

    if (!data) return;

    setNome(
      data.nome || ''
    );

    setPontoInstalacao(
      data.ponto_instalacao || ''
    );

    setPotencia(
      String(
        data.potencia_kwp || ''
      )
    );

    setGeracaoMedia(
      String(
        data.geracao_media || ''
      )
    );

    setInvestimento(
      String(
        data.investimento || ''
      )
    );
  }

  async function salvar() {

    setSalvando(true);

    const payload = {
      nome,
      ponto_instalacao:
        pontoInstalacao,
      potencia_kwp:
        Number(potencia),
      geracao_media:
        Number(geracaoMedia),
      investimento:
        Number(investimento),
    };

    console.log(
      'UPDATE:',
      payload
    );

    const { error } =
      await supabase
        .from('usinas')
        .update(payload)
        .eq('id', usinaId);

    setSalvando(false);

    if (error) {

      Alert.alert(
        'Erro',
        error.message
      );

      return;
    }

    Alert.alert(
      'Sucesso',
      'Usina atualizada.'
    );

    router.back();
  }

  function confirmarExclusao() {

    Alert.alert(
      'Excluir usina',
      'Deseja realmente excluir esta usina?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: excluirUsina,
        },
      ]
    );
  }

  async function excluirUsina() {

    const { error } =
      await supabase
        .from('usinas')
        .delete()
        .eq('id', usinaId);

    if (error) {

      Alert.alert(
        'Erro',
        error.message
      );

      return;
    }

    Alert.alert(
      'Sucesso',
      'Usina excluída.'
    );

    router.replace('/usinas');
  }

  return (

     <ImageBackground
source={require('../../assets/images/background.png')}        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={{
            flex: 1,
          }}
          >
      
   <View
  style={{
    width: '88%',          // diminui a largura
    alignSelf: 'center',   // centraliza o card
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
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
        Editar Usina
      </Text>

      <Text>
        Nome da usina
      </Text>

      <TextInput
        value={nome}
        onChangeText={setNome}
         style={styles.input}
        
      />

      <Text>
        Ponto de instalação
      </Text>

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

      <Text>
        Potência (kWp)
      </Text>

      <TextInput
        value={potencia}
        onChangeText={setPotencia}
        keyboardType="numeric"
        style={styles.input}
        
      />

      <Text>
        Geração média (kWh/mês)
      </Text>

      <TextInput
        value={geracaoMedia}
        onChangeText={setGeracaoMedia}
        keyboardType="numeric"
        style={styles.input}
        
      />

      <Text>
        Investimento
      </Text>

      <TextInput
        value={investimento}
        onChangeText={setInvestimento}
        keyboardType="numeric"
         style={styles.input}
        
      />

      <TouchableOpacity
        onPress={salvar}
        style={{
          backgroundColor: '#2563eb',
          padding: 15,
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
          {salvando
            ? 'SALVANDO...'
            : 'SALVAR'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={confirmarExclusao}
        style={{
          backgroundColor: '#dc2626',
          padding: 15,
          borderRadius: 10,
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
          EXCLUIR USINA
        </Text>
      </TouchableOpacity>

    </View>
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