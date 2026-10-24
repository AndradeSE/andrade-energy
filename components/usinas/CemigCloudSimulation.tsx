import {useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import {Button} from '../ui';
import {useAuth} from '../../contexts/AuthContext';
import {canViewServiceQuotas} from '../../utils/service-quota-access';
import {isPreviewEnvironment} from '../../config/environment';
import api from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../../theme';

type Session={id:string;estado:string;erro?:string|null;liveUrl?:string|null;capmonsterDisponivel?:boolean;captchaEstado?:string;captchaErro?:string|null};
const ativos=['FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO'];
const rotulos:Record<string,string>={FILA:'Preparando simulação…',INICIANDO:'Abrindo navegador em nuvem…',AGUARDANDO_LOGIN:'Entre na Cemig no navegador seguro e resolva o CAPTCHA manualmente.',VALIDANDO:'Conferindo o anexo…',REVISAO_SEM_PROTOCOLO:'Anexo chegou à revisão. Nenhum protocolo foi solicitado.',ERRO:'Não foi possível concluir a simulação.',CANCELADO:'Simulação cancelada.',EXPIRADO:'A sessão de dez minutos terminou.'};
export default function CemigCloudSimulation({usinaId,competencia,ucAncora,numerosConfirmados}:{usinaId:string;competencia?:string;ucAncora:string;numerosConfirmados:boolean}){
 const {usuario}=useAuth();const allowed=isPreviewEnvironment&&canViewServiceQuotas(usuario);
 const [session,setSession]=useState<Session>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const base=`/usinas/${usinaId}/cemig-simulacoes`;
 const storageKey=`cemig-simulacao:${usuario?.id}:${usinaId}:${competencia}`;
 useEffect(()=>{
  let active=true;setSession(undefined);setError('');
  if(allowed)void AsyncStorage.getItem(storageKey).then(async id=>{
   if(!id||!active)return;
   const r=await api.get<Session>(`${base}/${id}`,{timeout:12000});
   if(active)setSession(r.data);
  }).catch(()=>{});
  return()=>{active=false;};
 },[allowed,base,storageKey]);
 useEffect(()=>{
  if(!allowed||!session||!ativos.includes(session.estado))return;
  let active=true;
  let pending=false;
  const timer=setInterval(()=>{if(pending)return;pending=true;void api.get<Session>(`${base}/${session.id}`,{timeout:12000}).then(r=>{if(active){setSession(r.data);setError('');}}).catch(()=>{if(active)setError('Consulta temporariamente indisponível. A sessão encerra automaticamente.');}).finally(()=>{pending=false;});},4000);
  return()=>{active=false;clearInterval(timer);};
 },[allowed,base,session?.id,session?.estado]);
 async function start(){
  if(busy||!competencia||!numerosConfirmados)return;
  setBusy(true);setError('');
  try{const result=(await api.post<Session>(base,{competencia,ucAncora,numerosAtuaisConfirmados:true,autorizaNavegadorNuvem:true},{timeout:60000})).data;await AsyncStorage.setItem(storageKey,result.id);setSession(result);}
  catch(e:any){setError(e?.response?.data?.message??'Não foi possível iniciar. Tente novamente.');}finally{setBusy(false);}
 }
 async function action(acao:'continuar'|'cancelar'|'captcha'){
  if(!session||busy)return;setBusy(true);
  try{setSession((await api.post<Session>(`${base}/${session.id}/${acao}`,{autorizaCapmonster:acao==='captcha'},{timeout:15000})).data);}
  catch{setError('Não foi possível atualizar a sessão.');}finally{setBusy(false);}
 }
 async function open(){
  if(!session?.liveUrl)return;
  try{const url=new URL(session.liveUrl);if(url.protocol!=='https:'||!(url.hostname==='browserbase.com'||url.hostname.endsWith('.browserbase.com')))throw new Error();await Linking.openURL(url.toString());}
  catch{setError('Não foi possível abrir o navegador da simulação.');}
 }
 async function verificacaoRepetindo(){
  await action('cancelar');
  setError('Verificação do portal não concluída. Pare de repetir os CAPTCHAs nesta sessão. Baixe o CSV na seção abaixo e acesse a Cemig pelo navegador local. O envio automático ainda não está validado.');
 }
 if(!allowed)return null;
 return <View style={{gap:10,borderTopWidth:1,borderTopColor:Colors.border,paddingTop:16}}>
  <Text style={{color:Colors.text,fontWeight:'700'}}>Cemig · simulação em nuvem</Text>
  <Text style={{color:Colors.subtitle}}>Preview: somente anexo e revisão, sem solicitar alteração. Sessão de até dez minutos com login manual e teste opcional de CAPTCHA.</Text>
  {session?<Text accessibilityLiveRegion="polite" style={{color:Colors.text}}>{rotulos[session.estado]??session.estado}</Text>:null}
  {error||session?.erro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{error||session?.erro}</Text>:null}
  {!session||!ativos.includes(session.estado)?<Button title="Simular anexo na Cemig" disabled={busy||!competencia||!numerosConfirmados} onPress={()=>Alert.alert('Navegador em nuvem','O Browserbase processará sua sessão de login da Cemig e o CSV com UCs, CPFs/CNPJs e percentuais. Não salvamos sua senha. Autoriza esta simulação, sem protocolar?', [{text:'Cancelar',style:'cancel'},{text:'Autorizar simulação',onPress:()=>void start()}])}/>:null}
  {session?.liveUrl?<Button title="Abrir login da Cemig em nuvem" onPress={()=>void open()}/>:null}
  {session?.estado==='AGUARDANDO_LOGIN'&&session.capmonsterDisponivel&&(!session.captchaEstado||session.captchaEstado==='NAO_SOLICITADO')?<Button title="Testar CAPTCHA com CapMonster" disabled={busy} onPress={()=>Alert.alert('Usar crédito de teste?','O CapMonster receberá o endereço da página da Cemig, a chave pública, o identificador técnico do desafio e o tipo de navegador. Não enviaremos senha, CPF ou CSV. Uma tarefa poderá consumir parte do bônus de US$ 0,10, sem recarga ou repetição automática. A resposta pode não ser aceita pela Cemig. Autoriza este teste?', [{text:'Cancelar',style:'cancel'},{text:'Autorizar uma tentativa',onPress:()=>void action('captcha')}])}/>:null}
  {['FILA','RESOLVENDO'].includes(session?.captchaEstado??'')?<Text accessibilityLiveRegion="polite" style={{color:Colors.subtitle}}>Consultando o CapMonster. Não repita o teste nem resolva outro CAPTCHA ao mesmo tempo.</Text>:null}
  {session?.captchaEstado==='RESPOSTA_APLICADA'?<Text accessibilityLiveRegion="polite" style={{color:Colors.text}}>Resposta de teste aplicada. Abra a Cemig em nuvem e tente concluir o login. Isso ainda não confirma a aceitação pelo portal.</Text>:null}
  {session?.captchaErro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{session.captchaErro}</Text>:null}
  {session?.estado==='AGUARDANDO_LOGIN'?<Button title="Já entrei · validar anexo" disabled={busy||['FILA','RESOLVENDO'].includes(session.captchaEstado??'')} onPress={()=>void action('continuar')}/>:null}
  {session?.estado==='AGUARDANDO_LOGIN'?<Button title="CAPTCHA repetindo · encerrar sessão" disabled={busy} onPress={()=>void verificacaoRepetindo()}/>:null}
  {session&&ativos.includes(session.estado)?<Button title="Cancelar simulação" disabled={busy} onPress={()=>void action('cancelar')}/>:null}
  <Button title="Abrir Cemig no navegador local" onPress={()=>void Linking.openURL('https://www.atendimento.cemig.com.br/portal/home').catch(()=>setError('Não foi possível abrir o portal.'))}/>
  <Text style={{color:Colors.subtitle}}>No acesso local, baixe o CSV pelas opções desta tela e anexe no portal. A sessão local não é compartilhada com a nuvem. Nesta simulação, pare na revisão sem solicitar cadastro.</Text>
  {!numerosConfirmados?<Text style={{color:Colors.subtitle}}>Confira os números atuais das UCs em Âncora e configuração para habilitar.</Text>:null}
 </View>;
}
