import {useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import {Button} from '../ui';
import {useAuth} from '../../contexts/AuthContext';
import {canViewServiceQuotas} from '../../utils/service-quota-access';
import {isPreviewEnvironment} from '../../config/environment';
import api from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../../theme';

type Session={id:string;estado:string;provedor?:'BROWSERBASE'|'STEEL';erro?:string|null;liveUrl?:string|null;capmonsterDisponivel?:boolean;captchaEstado?:string;captchaErro?:string|null;expiraEm?:string;captchaBloqueio?:string|null;loginEstado?:string;loginErro?:string|null};
const ativos=['FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO'];
const rotulos:Record<string,string>={FILA:'Preparando simulação…',INICIANDO:'Abrindo navegador em nuvem…',AGUARDANDO_LOGIN:'Entre na Cemig no navegador seguro e resolva o CAPTCHA manualmente.',VALIDANDO:'Conferindo o anexo…',REVISAO_SEM_PROTOCOLO:'Anexo chegou à revisão. Nenhum protocolo foi solicitado.',ERRO:'Não foi possível concluir a simulação.',CANCELADO:'Simulação cancelada.',EXPIRADO:'A sessão de teste terminou.'};
export default function CemigCloudSimulation({usinaId,competencia,ucAncora,numerosConfirmados,vaultConfigured=false}:{usinaId:string;competencia?:string;ucAncora:string;numerosConfirmados:boolean;vaultConfigured?:boolean}){
 const {usuario}=useAuth();const allowed=isPreviewEnvironment&&canViewServiceQuotas(usuario);
 const [session,setSession]=useState<Session>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [detalhes,setDetalhes]=useState(false);
 const [queryError,setQueryError]=useState('');const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(session?.estado!=='AGUARDANDO_LOGIN')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[session?.id,session?.estado]);
 const remaining=session?.expiraEm?Math.max(0,Date.parse(session.expiraEm)-now):undefined;
 const captchaBlocked=session?.captchaBloqueio||(remaining!==undefined&&remaining<180000?'Restam menos de três minutos. O teste não será enviado ao CapMonster. Confira a cota antes de abrir outra sessão.':null);
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
  const timer=setInterval(()=>{if(pending)return;pending=true;void api.get<Session>(`${base}/${session.id}`,{timeout:12000}).then(r=>{if(active){setSession(r.data);setQueryError('');}}).catch(()=>{if(active)setQueryError('Consulta temporariamente indisponível. A sessão encerra automaticamente.');}).finally(()=>{pending=false;});},4000);
  return()=>{active=false;clearInterval(timer);};
 },[allowed,base,session?.id,session?.estado]);
 async function start(){
  if(busy||!competencia||!numerosConfirmados)return;
  setBusy(true);setError('');
  try{const result=(await api.post<Session>(base,{competencia,ucAncora,numerosAtuaisConfirmados:true,autorizaNavegadorNuvem:true,autorizaSteel:true},{timeout:60000})).data;await AsyncStorage.setItem(storageKey,result.id);setSession(result);}
  catch(e:any){setError(e?.response?.data?.message??'Não foi possível iniciar. Tente novamente.');}finally{setBusy(false);}
 }
 async function action(acao:'continuar'|'cancelar'|'captcha'|'login',loginAposCaptcha=false){
  if(!session||busy)return;setBusy(true);setError('');
  try{setSession((await api.post<Session>(`${base}/${session.id}/${acao}`,{autorizaCapmonster:acao==='captcha',autorizaLoginCemig:acao==='login'||(acao==='captcha'&&loginAposCaptcha)},{timeout:15000})).data);}
  catch(e:any){setError(e?.response?.data?.message??'O servidor não confirmou o comando. Confira o estado da sessão antes de repetir.');}finally{setBusy(false);}
 }
 async function open(){
  if(!session?.liveUrl)return;
  try{const url=new URL(session.liveUrl);const domain=session.provedor==='STEEL'?'steel.dev':'browserbase.com';if(url.protocol!=='https:'||url.username||url.password||!(url.hostname===domain||url.hostname.endsWith(`.${domain}`)))throw new Error();await Linking.openURL(url.toString());}
  catch{setError('Não foi possível abrir o navegador da simulação.');}
 }
 async function verificacaoRepetindo(){
  await action('cancelar');
  setError('Verificação do portal não concluída. Pare de repetir os CAPTCHAs nesta sessão. Baixe o CSV na seção abaixo e acesse a Cemig pelo navegador local. O envio automático ainda não está validado.');
 }
 if(!allowed)return null;
 return <View style={{gap:10,borderTopWidth:1,borderTopColor:Colors.border,paddingTop:16}}>
  <Text style={{color:Colors.text,fontWeight:'700'}}>Cemig · simulação em nuvem</Text>
  <Text style={{color:Colors.subtitle}}>Simulação no Preview até a revisão do arquivo. Nenhuma alteração será protocolada.</Text>
  {session?<Text accessibilityLiveRegion="polite" style={{color:Colors.text}}>{rotulos[session.estado]??session.estado}</Text>:null}
  {session?.provedor?<Text style={{color:Colors.subtitle}}>Navegador: {session.provedor==='STEEL'?'Steel · reserva':'Browserbase · principal'}</Text>:null}
  {queryError?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{queryError}</Text>:null}
  {session?.estado==='AGUARDANDO_LOGIN'&&remaining!==undefined?<Text accessibilityLiveRegion="none" style={{color:Colors.subtitle}}>Tempo restante: {Math.floor(remaining/60000)}:{String(Math.floor(remaining/1000)%60).padStart(2,'0')}</Text>:null}
  {error||session?.erro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{error||session?.erro}</Text>:null}
  {!session||!ativos.includes(session.estado)?<Button title="Iniciar simulação" disabled={busy||!competencia||!numerosConfirmados} onPress={()=>Alert.alert('Navegador em nuvem','O Browserbase, ou o Steel como reserva se faltar cota e houver crédito de teste confirmado, processará sua sessão de login da Cemig e o CSV com UCs, CPFs/CNPJs e percentuais. O acesso salvo, quando cadastrado, permanece no cofre protegido do app. Autoriza esta simulação, sem protocolar?', [{text:'Cancelar',style:'cancel'},{text:'Autorizar simulação',onPress:()=>void start()}])}/>:null}
  {session?.liveUrl?<Button title="Abrir sessão da Cemig" onPress={()=>void open()}/>:null}
  {session?.estado==='AGUARDANDO_LOGIN'&&session.capmonsterDisponivel&&(!session.captchaEstado||session.captchaEstado==='NAO_SOLICITADO')?<Button title="Autorizar verificação e continuar" disabled={busy||!!captchaBlocked} onPress={()=>Alert.alert('Usar crédito de teste?','O CapMonster receberá o endereço da página da Cemig, a chave pública, o identificador técnico do desafio e o tipo de navegador. Não enviaremos senha, CPF ou CSV. Uma tarefa poderá consumir parte do bônus de US$ 0,10, sem recarga ou repetição automática. A resposta pode não ser aceita pela Cemig. Se houver acesso salvo, o navegador em nuvem usará esse acesso imediatamente após a resposta para uma única tentativa de login e revisão do anexo, sem protocolar. A senha não será enviada ao CapMonster. Autoriza este teste e o login?', [{text:'Cancelar',style:'cancel'},{text:'Autorizar uma tentativa',onPress:()=>void action('captcha',vaultConfigured)}])}/>:null}
  {session?.estado==='AGUARDANDO_LOGIN'&&session.capmonsterDisponivel&&captchaBlocked?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{captchaBlocked}</Text>:null}
  {['FILA','RESOLVENDO'].includes(session?.captchaEstado??'')?<Text accessibilityLiveRegion="polite" style={{color:Colors.subtitle}}>Consultando o CapMonster. Não repita o teste nem resolva outro CAPTCHA ao mesmo tempo.</Text>:null}
  {session?.captchaEstado==='RESPOSTA_APLICADA'?<Text accessibilityLiveRegion="polite" style={{color:Colors.text}}>Resposta de teste aplicada. A aceitação ainda será conferida pela Cemig.</Text>:null}
  {session?.estado==='AGUARDANDO_LOGIN'&&session.captchaEstado==='RESPOSTA_APLICADA'&&vaultConfigured&&session.loginEstado==='NAO_SOLICITADO'?<Button title="Entrar com acesso salvo" disabled={busy} onPress={()=>Alert.alert('Autorizar login na Cemig','O acesso salvo será usado pelo navegador em nuvem desta sessão para preencher e enviar uma única tentativa ao domínio oficial da Cemig. Após o login, o app tentará anexar o CSV somente até a revisão, sem protocolar. Autoriza?',[
   {text:'Cancelar',style:'cancel'},{text:'Entrar e validar anexo',onPress:()=>void action('login')},
  ])}/>:null}
  {session?.loginEstado==='ENVIADO'?<Text style={{color:Colors.subtitle}}>Login enviado uma vez. A validação do anexo ainda precisa confirmar o acesso à Cemig.</Text>:null}
  {['FILA','ENVIANDO'].includes(session?.loginEstado??'')?<Text style={{color:Colors.subtitle}}>Preenchendo o login autorizado. Não repita a entrada no portal.</Text>:null}
  {session?.loginErro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{session.loginErro}</Text>:null}
  {session?.captchaErro?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{session.captchaErro}</Text>:null}
  {session?.estado==='AGUARDANDO_LOGIN'?<Button title="Continuar após verificação manual" disabled={busy||['FILA','RESOLVENDO'].includes(session.captchaEstado??'')} onPress={()=>void action('continuar')}/>:null}
  <Button title={detalhes?'Ocultar opções de suporte':'Opções de suporte'} onPress={()=>setDetalhes(v=>!v)}/>
  {detalhes?<View style={{gap:10}}>
  {session?.estado==='AGUARDANDO_LOGIN'?<Button title="CAPTCHA repetindo · encerrar sessão" disabled={busy} onPress={()=>void verificacaoRepetindo()}/>:null}
  {session&&ativos.includes(session.estado)?<Button title="Cancelar simulação" disabled={busy} onPress={()=>void action('cancelar')}/>:null}
  <Button title="Abrir Cemig no navegador local" onPress={()=>void Linking.openURL('https://atende.cemig.com.br/Login').catch(()=>setError('Não foi possível abrir o portal.'))}/>
  <Text style={{color:Colors.subtitle}}>No acesso local, baixe o CSV pelas opções desta tela e anexe no portal. A sessão local não é compartilhada com a nuvem. Nesta simulação, pare na revisão sem solicitar cadastro.</Text>
  </View>:null}
  {!numerosConfirmados?<Text style={{color:Colors.subtitle}}>Confira os números atuais das UCs em Âncora e configuração para habilitar.</Text>:null}
 </View>;
}
