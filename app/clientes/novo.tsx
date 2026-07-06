import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

export default function NovoCliente() {

  const [nome, setNome] = useState('');
  const [uc, setUc] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [usinaId, setUsinaId] = useState('');
  const [mostrarUsinas, setMostrarUsinas] =
  useState(false);

  const [usinas, setUsinas] =
    useState<any[]>([]);

  useEffect(() => {
    carregarUsinas();
  }, []);

  async function carregarUsinas() {

    const { data } =
      await supabase
        .from('usinas')
        .select('*')
        .order('nome');

    setUsinas(data || []);

  }

  async function salvar() {

    const { error } =
      await supabase
        .from('clientes')
        .insert({

          nome,

          uc: uc.replace(/\D/g, ''),

          telefone,

          cpf,

          endereco,

          distribuidora: 'CEMIG',

          usina_id: usinaId || null,

        });

    if (error) {

      alert(error.message);

      return;

    }

    router.back();

  }

  return (

<ImageBackground
source={require('../../assets/images/background.png')}style={{
flex:1
}}
>

<SafeAreaView
style={{
flex:1
}}
>

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

Novo Cliente

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
keyboardType="phone-pad"
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
  onPress={() =>
    setMostrarUsinas(!mostrarUsinas)
  }
  style={styles.input}
>
  <Text>
    {
      usinas.find(
        u => u.id === usinaId
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
marginBottom:18,
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
padding:14,
borderBottomWidth:1,
borderBottomColor:'#f1f5f9',
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
backgroundColor:'#16a34a',
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

SALVAR CLIENTE

</Text>

</TouchableOpacity>

</View>

</ScrollView>

</SafeAreaView>

</ImageBackground>

);

}

const styles={

input:{

borderWidth:1,

borderColor:'#d1d5db',

backgroundColor:'#fff',

padding:12,

borderRadius:10,

marginTop:5,

marginBottom:18,

},

};