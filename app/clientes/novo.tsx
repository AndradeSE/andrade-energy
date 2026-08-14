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
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [usinaId, setUsinaId] = useState('');
  const [modalidadeFaturamento, setModalidadeFaturamento] =
    useState<'INJECAO' | 'COMPENSACAO'>('COMPENSACAO');
  const [descontoPercentual, setDescontoPercentual] = useState('40');
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

    const desconto = Number(descontoPercentual.replace(',', '.'));

    if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
      alert('Informe um desconto entre 0% e 100%.');
      return;
    }

    const { error } =
      await supabase
        .from('clientes')
        .insert({

          nome,

          uc: uc.replace(/\D/g, ''),

          telefone,

          whatsapp: telefone.replace(/\D/g, ''),

          email: email.trim().toLowerCase(),

          cpf,

          endereco,

          distribuidora: 'CEMIG',

          usina_id: usinaId || null,

          modalidade_faturamento: modalidadeFaturamento,

          desconto_percentual: desconto,

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

<Text>Telefone / WhatsApp</Text>

<TextInput
value={telefone}
onChangeText={setTelefone}
keyboardType="phone-pad"
style={styles.input}
/>

<Text>E-mail para envio das faturas</Text>

<TextInput
value={email}
onChangeText={setEmail}
autoCapitalize="none"
keyboardType="email-address"
style={styles.input}
/>

<Text>Modalidade de faturamento</Text>

<View style={styles.optionRow}>
  {(['INJECAO', 'COMPENSACAO'] as const).map((modalidade) => (
    <Pressable
      key={modalidade}
      onPress={() => setModalidadeFaturamento(modalidade)}
      style={[
        styles.option,
        modalidadeFaturamento === modalidade && styles.optionSelected,
      ]}
    >
      <Text
        style={
          modalidadeFaturamento === modalidade
            ? styles.optionTextSelected
            : styles.optionText
        }
      >
        {modalidade === 'INJECAO' ? 'Por injeção' : 'Por compensação'}
      </Text>
    </Pressable>
  ))}
</View>

<Text>Desconto contratado (%)</Text>

<TextInput
value={descontoPercentual}
onChangeText={setDescontoPercentual}
keyboardType="decimal-pad"
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

optionRow:{
flexDirection:'row' as const,
gap:10,
marginTop:5,
marginBottom:18,
},

option:{
flex:1,
padding:12,
borderWidth:1,
borderColor:'#d1d5db',
borderRadius:10,
backgroundColor:'#fff',
alignItems:'center' as const,
},

optionSelected:{
borderColor:'#16a34a',
backgroundColor:'#ecfdf5',
},

optionText:{
color:'#64748b',
fontWeight:'600' as const,
},

optionTextSelected:{
color:'#047857',
fontWeight:'700' as const,
},

};
