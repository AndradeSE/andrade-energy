import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../supabase';

import { Usina } from '../../types/Usina';

export default function EditarCliente() {

  const { id } = useLocalSearchParams();

  const clienteId = Array.isArray(id)
    ? id[0]
    : id;

  const [nome, setNome] = useState('');
  const [uc, setUc] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [usinaId, setUsinaId] = useState('');

  const [usinas,setUsinas]=
useState<Usina[]>([]);
  const [mostrarUsinas, setMostrarUsinas] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);
    

  useEffect(() => {

  carregarCliente();
  carregarUsinas();

}, []);
  


async function carregarCliente() {

  const { data } =
    await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

  if (!data) return;

  setNome(data.nome || '');
  setUc(data.uc || '');
  setTelefone(data.telefone || '');
  setCpf(data.cpf || '');
  setEndereco(data.endereco || '');
  setUsinaId(data.usina_id || '');

}
async function carregarUsinas() {

  const { data } =
    await supabase
      .from('usinas')
      .select('*')
      .order('nome');

  setUsinas(data || []);

}

async function salvar() {

  setSalvando(true);

  const { error } =
    await supabase
      .from('clientes')
      .update({

        nome,

        uc: uc.replace(/\D/g,''),

        telefone,

        cpf,

        endereco,

        usina_id: usinaId,

      })

      .eq('id', clienteId);

  setSalvando(false);

  if(error){

    Alert.alert(
      'Erro',
      error.message
    );

    return;

  }

  router.back();

}
async function excluirCliente() {

  Alert.alert(

    'Excluir',

    'Deseja realmente excluir este cliente?',

    [

      {
        text:'Cancelar',
        style:'cancel',
      },

      {

        text:'Excluir',

        style:'destructive',

        onPress: async()=>{

          await supabase
            .from('cobrancas')
            .delete()
            .eq('cliente_id',clienteId);

          await supabase
            .from('faturas')
            .delete()
            .eq('cliente_id',clienteId);

          const { error } =
            await supabase
              .from('clientes')
              .delete()
              .eq('id',clienteId);

          if(error){

            Alert.alert(
              'Erro',
              error.message
            );

            return;

          }

          router.replace('/clientes');

        }

      }

    ]

  );}
return (

<ImageBackground
  source={require('../../assets/images/background.png')}
  resizeMode="cover"
  style={{ flex: 1 }}
>

<SafeAreaView style={{ flex: 1 }}>

<ScrollView
contentContainerStyle={{
padding:20,
paddingTop:60,
}}
>

<View
style={{
backgroundColor:'rgba(255,255,255,0.95)',
padding:20,
borderRadius:18,
}}
>

<Text
style={{
fontSize:24,
fontWeight:'bold',
marginBottom:20,
}}
>

Editar Cliente

</Text>

<Text>Nome</Text>

<TextInput
value={nome}
onChangeText={setNome}
style={styles.input}
/>

<Text>UC</Text>

<TextInput
value={uc}
onChangeText={(t)=>setUc(t.replace(/\D/g,''))}
keyboardType="numeric"
style={styles.input}
/>

<Text>Telefone</Text>

<TextInput
value={telefone}
onChangeText={setTelefone}
style={styles.input}
/>

<Text>CPF</Text>

<TextInput
value={cpf}
onChangeText={setCpf}
style={styles.input}
/>

<Text>Endereço</Text>

<TextInput
value={endereco}
onChangeText={setEndereco}
style={styles.input}
/>

<Text>Usina</Text>

<Pressable
onPress={()=>
setMostrarUsinas(!mostrarUsinas)
}
style={styles.input}
>

<Text>

{
usinas.find(
u=>u.id===usinaId
)?.nome ||

'Selecione uma usina'

}

</Text>

</Pressable>

{mostrarUsinas && (

<View
style={{
borderWidth:1,
borderColor:'#d1d5db',
borderRadius:10,
backgroundColor:'white',
marginBottom:20,
}}
>

{usinas.map(usina=>(

<TouchableOpacity
key={usina.id}
onPress={()=>{
setUsinaId(usina.id);
setMostrarUsinas(false);
}}
style={{
padding:15,
borderBottomWidth:1,
borderBottomColor:'#e5e7eb',
}}
>

<Text>

{usina.nome}

</Text>

</TouchableOpacity>

))}

</View>

)}

<TouchableOpacity
onPress={salvar}
style={{
backgroundColor:'#2563eb',
padding:15,
borderRadius:10,
marginTop:20,
}}
>

<Text
style={{
color:'white',
fontWeight:'bold',
textAlign:'center',
}}
>

{salvando ? 'SALVANDO...' : 'SALVAR'}

</Text>

</TouchableOpacity>

<TouchableOpacity
onPress={excluirCliente}
style={{
backgroundColor:'#dc2626',
padding:15,
borderRadius:10,
marginTop:12,
}}
>

<Text
style={{
color:'white',
fontWeight:'bold',
textAlign:'center',
}}
>

EXCLUIR CLIENTE

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