import {useEffect,useState} from 'react';
import {Alert,AppState,Text,TextInput,View} from 'react-native';
import {Button} from '../ui';
import {TouchableOpacity} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import api from '../../config/api';
import {Colors} from '../../theme';

export default function CemigCredentialVault({usinaId,onConfigured}:{usinaId:string;onConfigured:(value:boolean)=>void}){
 const [showPassword,setShowPassword]=useState(false);
 const formatLogin=(value:string)=>{if(/[^0-9.\-]/.test(value))return value;return value.replace(/\D/g,'').slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');};
 const [configured,setConfigured]=useState(false);const [editing,setEditing]=useState(false);
 const [login,setLogin]=useState('');const [senha,setSenha]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const base=`/usinas/${usinaId}/cemig-acesso`;
 useEffect(()=>{
  let active=true;setLogin('');setSenha('');setShowPassword(false);setEditing(false);setMessage('');setConfigured(false);onConfigured(false);
  void api.get<{configurado:boolean}>(base,{timeout:12000}).then(r=>{if(active){setConfigured(r.data.configurado);onConfigured(r.data.configurado);}})
   .catch(()=>{if(active)setMessage('Não foi possível consultar o cofre.');});
  return()=>{active=false;};
 },[base,onConfigured]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active'){setLogin('');setSenha('');}});return()=>sub.remove();},[]);
 async function save(){
  if(busy||!login.trim()||!senha)return;setBusy(true);setMessage('');
  try{await api.put(base,{login:/^[0-9.\-]+$/.test(login)?login.replace(/\D/g,''):login,senha,autorizaArmazenamento:true},{timeout:15000});setConfigured(true);onConfigured(true);setEditing(false);setMessage('Acesso salvo no cofre criptografado.');}
  catch{setMessage('Não foi possível salvar. Digite novamente somente quando for repetir o cadastro.');}
  finally{setLogin('');setSenha('');setBusy(false);}
 }
 async function remove(){
  if(busy)return;setBusy(true);
  try{await api.delete(base,{timeout:15000});setConfigured(false);onConfigured(false);setEditing(false);setMessage('Acesso removido do cofre.');}
  catch{setMessage('Não foi possível remover o acesso.');}
  finally{setLogin('');setSenha('');setBusy(false);}
 }
 const field={borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:12,color:Colors.text};
 return <View style={{gap:10,borderWidth:1,borderColor:Colors.border,borderRadius:14,padding:14}}>
  <Text style={{color:Colors.text,fontWeight:'700'}}>Acesso protegido da Cemig</Text>
  <Text style={{color:Colors.subtitle}}>{configured?'Acesso cadastrado. A senha não é exibida novamente.':'Cadastre o usuário e a senha da Cemig para preencher o login pela sessão autorizada.'} O cofre é separado por conta e empresa. A Solar e o CapMonster não recebem esses dados.</Text>
  {!editing?<Button title={configured?'Substituir acesso salvo':'Cadastrar acesso da Cemig'} disabled={busy} onPress={()=>{setEditing(true);setMessage('');}}/>:null}
  {editing?<>
   <Text style={{color:Colors.text}}>Usuário da Cemig</Text>
   <TextInput accessibilityLabel="Usuário da Cemig" value={login} onChangeText={value=>setLogin(formatLogin(value))} maxLength={254} autoCapitalize="none" autoCorrect={false} autoComplete="off" style={field}/>
   <Text style={{color:Colors.text}}>Senha da Cemig</Text>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
   <TextInput accessibilityLabel="Senha da Cemig" value={senha} onChangeText={setSenha} secureTextEntry={!showPassword} maxLength={512} autoCapitalize="none" autoCorrect={false} autoComplete="off" style={[field,{flex:1}]}/>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword?'Ocultar senha':'Mostrar senha'} onPress={()=>setShowPassword(value=>!value)} style={{padding:12,minWidth:48,minHeight:48}}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d={showPassword?'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0':'M3 9c2 4 5 6 9 6s7-2 9-6 M5 13l-2 3 M9 15l-1 4 M15 15l1 4 M19 13l2 3'} fill="none" stroke={Colors.primary} strokeWidth={1.8} strokeLinecap="round"/></Svg></TouchableOpacity>
   </View>
   <Button title="Salvar no cofre" disabled={busy||!login.trim()||!senha} onPress={()=>Alert.alert('Salvar acesso da Cemig','O acesso ficará criptografado no servidor deste ambiente e poderá preencher o login no domínio oficial da Cemig pela sessão que você autorizar. Não será enviado à Solar ou ao CapMonster. Deseja salvar?',[
    {text:'Cancelar',style:'cancel'},{text:'Salvar acesso',onPress:()=>void save()},
   ])}/>
   <Button title="Cancelar edição" disabled={busy} onPress={()=>{setLogin('');setSenha('');setEditing(false);}}/>
  </>:null}
  {configured?<Button title="Remover acesso salvo" disabled={busy} onPress={()=>Alert.alert('Remover acesso','A senha será removida do cofre. Para usar novamente, você precisará cadastrá-la. Uma entrada já enviada ao portal não pode ser desfeita.',[
   {text:'Cancelar',style:'cancel'},{text:'Remover acesso',style:'destructive',onPress:()=>void remove()},
  ])}/>:null}
  {message?<Text accessibilityRole="alert" style={{color:Colors.subtitle}}>{message}</Text>:null}
 </View>;
}
