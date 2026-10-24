import {useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import {Button} from '../ui';
import {useAuth} from '../../contexts/AuthContext';
import {canViewServiceQuotas} from '../../utils/service-quota-access';
import {isPreviewEnvironment} from '../../config/environment';
import api from '../../config/api';
import {Colors} from '../../theme';

type Session={id:string;estado:string;erro?:string|null;liveUrl?:string|null};
const ativos=['FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO'];
const rotulos:Record<string,string>={FILA:'Preparando simulação…',INICIANDO:'Abrindo navegador em nuvem…',AGUARDANDO_LOGIN:'Entre na Cemig no navegador seguro e resolva o CAPTCHA manualmente.',VALIDANDO:'Conferindo o anexo…',REVISAO_SEM_PROTOCOLO:'Anexo chegou à revisão. Nenhum protocolo foi solicitado.',ERRO:'Não foi possível concluir a simulação.',CANCELADO:'Simulação cancelada.',EXPIRADO:'A sessão de dez minutos terminou.'};
export default function CemigCloudSimulation({usinaId,competencia,ucAncora,numerosConfirmados}:{usinaId:string;competencia?:string;ucAncora:string;numerosConfirmados:boolean}){
 const {usuario}=useAuth();const allowed=isPreviewEnvironment&&canViewServiceQuotas(usuario);
 const [session,setSession]=useState<Session>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const base=`/usinas/${usinaId}/cemig-simulacoes`;
 useEffect(()=>{setSession(undefined);setError('');},[usinaId,competencia]);
 useEffect(()=>{
  if(!allowed||!session||!ativos.includes(session.estado))return;
  let active=true;
  const timer=setInterval(()=>{void api.get<Session>(`${base}/${session.id}`,{timeout:12000}).then(r=>{if(active){setSession(r.data);setError('');}}).catch(()=>{if(active)setError('Consulta temporariamente indisponível. A sessão encerra automaticamente.');});},4000);
  return()=>{active=false;clearInterval(timer);};
 },[allowed,base,session?.id,session?.estado]);
 async function start(){
  if(busy||!competencia||!numerosConfirmados)return;
  setBusy(true);setError('');
  try{setSession((await api.post<Session>(base,{competencia,ucAncora,numerosAtuaisConfirmados:true,autorizaNavegadorNuvem:true},{timeout:60000})).data);}
  catch(e:any){setError(e?.response?.data?.message??'Não foi possível iniciar. Tente novamente.');}finally{setBusy(false);}
 }
 async function action(acao:'continuar'|'cancelar'){
  if(!session||busy)return;setBusy(true);
  try{setSession((await api.post<Session>(`${base}/${session.id}/${acao}`,{},{timeout:15000})).data);}
  catch{setError('Não foi possível atualizar a sessão.');}finally{setBusy(false);}
 }
 async function open(){
  if(!session?.liveUrl)return;
  try{const url=new URL(session.liveUrl);if(url.protocol!=='https:'||!(url.hostname==='browserbase.com'||url.hostname.endsWith('.browserbase.com')))throw new Error();await Linking.openURL(url.toString());}
  catch{setError('Não foi possível abrir o navegador da simulação.');}
 }
 if(!allowed)return null;
 return <View style={{gap:10,borderTopWidth:1,borderTopColor:Colors.border,paddingTop:16}}>
  <Text style={{color:Colors.text,fontWeight:'700'}}>Cemig · simulação em nuvem</Text>
  <Text style={{color:Colors.subtitle}}>Preview: somente anexo e revisão, sem solicitar alteração. Sessão de até dez minutos com login e CAPTCHA manuais.</Text>
  {session?<Text accessibilityLiveRegion="polite" style={{color:Colors.text}}>{rotulos[session.estado]??session.estado}</Text>:null}
  {error||session?.erro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{error||session?.erro}</Text>:null}
  {!session||!ativos.includes(session.estado)?<Button title="Simular anexo na Cemig" disabled={busy||!competencia||!numerosConfirmados} onPress={()=>Alert.alert('Navegador em nuvem','O Browserbase processará sua sessão de login da Cemig e o CSV com UCs, CPFs/CNPJs e percentuais. Não salvamos sua senha. Autoriza esta simulação, sem protocolar?', [{text:'Cancelar',style:'cancel'},{text:'Autorizar simulação',onPress:()=>void start()}])}/>:null}
  {session?.liveUrl?<Button title="Abrir login da Cemig em nuvem" onPress={()=>void open()}/>:null}
  {session?.estado==='AGUARDANDO_LOGIN'?<Button title="Já entrei · validar anexo" disabled={busy} onPress={()=>void action('continuar')}/>:null}
  {session&&ativos.includes(session.estado)?<Button title="Cancelar simulação" disabled={busy} onPress={()=>void action('cancelar')}/>:null}
  {!numerosConfirmados?<Text style={{color:Colors.subtitle}}>Confira os números atuais das UCs em Âncora e configuração para habilitar.</Text>:null}
 </View>;
}
