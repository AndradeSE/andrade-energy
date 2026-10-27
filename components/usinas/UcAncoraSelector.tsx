import {useEffect,useRef,useState} from 'react';
import {Alert,Keyboard,KeyboardAvoidingView,Modal,Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {Pressable} from '../assistant/AssistantNativeControls';
import FormField from '../cadastro/FormField';
import {Button} from '../ui';
import {Colors} from '../../theme';
import {listarUcsAncoras,salvarUcAncora,excluirUcAncora,type UcAncoraCadastrada} from '../../services/usinas.service';

export default function UcAncoraSelector({usinaId,empresaId,value,onChange,disabled}:{usinaId:string;empresaId:string;value:string;onChange:(uc:string)=>void;disabled:boolean}){
 const [itens,setItens]=useState<UcAncoraCadastrada[]>([]),[aberto,setAberto]=useState(false),[carregando,setCarregando]=useState(true),[erro,setErro]=useState(false),[salvando,setSalvando]=useState(false);
 const [formulario,setFormulario]=useState(false),[edicao,setEdicao]=useState<UcAncoraCadastrada>(),[numero,setNumero]=useState(''),[apelido,setApelido]=useState('');
 const [escolha,setEscolha]=useState(value);
 const [revisao,setRevisao]=useState(0);const insets=useSafeAreaInsets();
 const escopo=`${empresaId}:${usinaId}`,atual=useRef(escopo);atual.current=escopo;
 useEffect(()=>{let ativo=true;setItens([]);setErro(false);setCarregando(true);setAberto(false);setFormulario(false);setSalvando(false);
  void listarUcsAncoras(usinaId).then(rows=>{if(ativo)setItens(rows);}).catch(()=>{if(ativo)setErro(true);}).finally(()=>{if(ativo)setCarregando(false);});
  return()=>{ativo=false;};
 },[escopo,revisao]);
 const selecionada=itens.find(i=>i.numero===value);
 function fechar(){if(!salvando){setAberto(false);setFormulario(false);}}
 function editar(item?:UcAncoraCadastrada){setEdicao(item);setNumero(item?.numero??value);setApelido(item?.apelido??'');setFormulario(true);}
 async function salvar(){
  if(salvando||disabled)return;
  if(!/^\d{6,20}$/.test(numero)){Alert.alert('Confira a UC','Informe de 6 a 20 dígitos.');return;}
  const pedido=escopo;setSalvando(true);
  try{const item=await salvarUcAncora(usinaId,{numero,apelido},edicao?.id);if(atual.current!==pedido)return;
   setItens(rows=>[...rows.filter(r=>r.id!==item.id),item].sort((a,b)=>(a.apelido||a.numero).localeCompare(b.apelido||b.numero,'pt-BR')));
   // Selecting a saved registry entry is a draft until the rateio is saved.
   onChange(item.numero);setFormulario(false);setAberto(false);
  }catch(e:any){if(atual.current===pedido)Alert.alert('Não foi possível salvar',e?.response?.data?.message??'Tente novamente.');}
  finally{if(atual.current===pedido)setSalvando(false);}
 }
 function remover(item:UcAncoraCadastrada){const pedido=escopo;
  Alert.alert('Excluir UC da lista?',`${item.apelido||'UC âncora'} · ${item.numero}\nIsso remove apenas o cadastro da lista. Rateios gerados e configurações já salvas permanecem iguais.`,[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>{void(async()=>{
   if(atual.current!==pedido)return;setSalvando(true);
   try{await excluirUcAncora(usinaId,item.id);if(atual.current===pedido){setItens(rows=>rows.filter(r=>r.id!==item.id));}}
   catch(e:any){if(atual.current===pedido)Alert.alert('Não foi possível excluir',e?.response?.data?.message??'Tente novamente.');}
   finally{if(atual.current===pedido)setSalvando(false);}
  })();}}]);
 }
 return <View style={{gap:8}}>
  <Text style={styles.titulo}>UC âncora</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar UC âncora. ${selecionada?.apelido||value||'Nenhuma selecionada'}`} disabled={disabled||carregando} onPress={()=>{setEscolha(value);setAberto(true);}} style={[styles.seletor,{opacity:disabled?0.5:1}]}>
   <View style={{flex:1,gap:4}}><Text style={styles.titulo}>{carregando?'Carregando âncoras…':selecionada?.apelido|| (value?'UC âncora selecionada':'Selecionar ou adicionar âncora')}</Text>
    {value?<Text style={styles.texto}>UC {value}{!selecionada&&!carregando?' · fora da lista':''}</Text>:null}</View><Ionicons name="chevron-down" color={Colors.primary} size={22}/>
  </Pressable>
  {erro?<Pressable accessibilityRole="button" onPress={()=>setRevisao(v=>v+1)} style={styles.acao}><Text style={{color:Colors.danger}}>Lista indisponível. Tocar para tentar novamente.</Text></Pressable>:null}
  <Text style={styles.texto}>Cadastre número e apelido. A última escolha salva será o padrão desta usina nos próximos meses.</Text>
  <Modal visible={aberto&&!disabled} transparent animationType="slide" onRequestClose={fechar}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.fundo}>
    <View accessibilityViewIsModal style={[styles.painel,{paddingBottom:Math.max(insets.bottom,16),marginTop:insets.top+24}]}>
     <View style={styles.linha}><Text style={[styles.titulo,{fontSize:20,flex:1}]}>{formulario?(edicao?'Editar UC âncora':'Adicionar UC âncora'):'UCs âncora'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar lista de âncoras" disabled={salvando} onPress={fechar} style={styles.icone}><Ionicons name="close" size={26} color={Colors.text}/></Pressable></View>
     <ScrollView style={{flexShrink:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} contentContainerStyle={{gap:16,paddingBottom:24}}>
      {formulario?<>
       <FormField label="Número da UC" required value={numero} onChangeText={v=>setNumero(v.replace(/\D/g,'').slice(0,20))} keyboardType="number-pad" editable={!salvando} maxLength={20} returnKeyType="done" onSubmitEditing={()=>Keyboard.dismiss()}/>
       <FormField label="Apelido (opcional)" value={apelido} onChangeText={setApelido} maxLength={80} editable={!salvando} placeholder="Ex.: Reserva Brazópolis" returnKeyType="done" onSubmitEditing={()=>Keyboard.dismiss()}/>
       <Button title={salvando?'Salvando…':'Salvar e confirmar âncora'} disabled={salvando||disabled} onPress={()=>void salvar()}/>
       <Pressable accessibilityRole="button" disabled={salvando} onPress={()=>setFormulario(false)} style={styles.acao}><Text style={{color:Colors.primary}}>Voltar à lista</Text></Pressable>
      </>:<>
       <Text style={styles.texto}>Âncoras da empresa, disponíveis para selecionar nas suas usinas.</Text>
       <Button title="Adicionar UC âncora" disabled={salvando||erro} onPress={()=>editar()}/>
       {erro?<Text style={{color:Colors.danger}}>Não foi possível consultar a lista. Feche e tente novamente.</Text>:null}
       {!erro&&!itens.length?<Text style={styles.texto}>Nenhuma UC cadastrada. Adicione a primeira âncora.</Text>:null}
       {itens.map(item=><View key={item.id} style={styles.item}>
        <Pressable accessibilityRole="radio" accessibilityState={{checked:item.numero===escolha,disabled:salvando}} accessibilityLabel={`${item.apelido||'UC âncora'}, UC ${item.numero}`} disabled={salvando} onPress={()=>setEscolha(item.numero)} style={[styles.linha,{minHeight:54}]}>
         <Ionicons name={item.numero===escolha?'radio-button-on':'radio-button-off'} size={23} color={Colors.primary}/><View style={{flex:1,gap:4}}><Text style={styles.titulo}>{item.apelido||'UC sem apelido'}</Text><Text style={styles.texto}>UC {item.numero}</Text></View>
        </Pressable>
        <View style={{flexDirection:'row',justifyContent:'flex-end',gap:12}}>
         <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.apelido||item.numero}`} disabled={salvando} onPress={()=>editar(item)} style={styles.acao}><Ionicons name="pencil-outline" size={18} color={Colors.primary}/><Text style={{color:Colors.primary}}>Editar</Text></Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${item.apelido||item.numero}`} disabled={salvando} onPress={()=>remover(item)} style={styles.acao}><Ionicons name="trash-outline" size={18} color={Colors.danger}/><Text style={{color:Colors.danger}}>Excluir</Text></Pressable>
        </View>
       </View>)}
       <Pressable accessibilityRole="button" disabled={salvando} onPress={()=>setEscolha('')} style={styles.acao}><Text style={{color:Colors.primary}}>{escolha===''?'✓ Sem âncora definida (rascunho)':'Usar sem âncora definida (rascunho)'}</Text></Pressable>
       <Button title="Confirmar âncora" disabled={salvando||disabled||erro} onPress={()=>{onChange(escolha);fechar();}}/>
       <Pressable accessibilityRole="button" onPress={fechar} disabled={salvando} style={styles.acao}><Text style={{color:Colors.primary}}>Cancelar</Text></Pressable>
      </>}
     </ScrollView>
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({titulo:{color:Colors.text,fontWeight:'700'},texto:{color:Colors.subtitle,lineHeight:20},seletor:{minHeight:64,borderWidth:1,borderColor:Colors.border,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:10},fundo:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.4)'},painel:{maxHeight:'90%',backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:12},linha:{flexDirection:'row',alignItems:'center',gap:10},icone:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},acao:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6},item:{borderWidth:1,borderColor:Colors.border,borderRadius:14,padding:12,gap:6}});
