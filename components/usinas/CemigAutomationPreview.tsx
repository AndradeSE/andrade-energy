import {useEffect,useState} from 'react';
import {Alert,Platform,Text,View} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import api from '../../config/api';
import {obterSessao} from '../../storage/session';
import {Button,Card} from '../ui';
import {Colors} from '../../theme';
import {isPreviewEnvironment} from '../../config/environment';

type Queue={habilitado:boolean;itens:{id:string;competencia:string;estado:string;protocolo?:string}[]};
export default function CemigAutomationPreview({usinaId}:{usinaId:string}){
 const [data,setData]=useState<Queue>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [prepared,setPrepared]=useState(false);
 const available=isPreviewEnvironment&&Platform.OS==='android'&&Constants.expoConfig?.extra?.nativeCemigAutomation===true;
 const url=`/usinas/${encodeURIComponent(usinaId)}/cemig-fila`;
 useEffect(()=>{let active=true;setData(undefined);if(available)void api.get<Queue>(url,{timeout:15000}).then(r=>{if(active)setData(r.data);}).catch(()=>{if(active)setError('A fila ainda não está disponível nesta versão do servidor.');});return()=>{active=false;};},[available,url]);
 if(!available)return null;
 async function configure(enabled:boolean,solver=false){
  if(busy)return;setBusy(true);setError('');
  let serverConfigured=false;
  try{
   const session=await obterSessao();if(!session?.token)throw Error('Entre novamente no Preview.');
   const response=await api.put(url,{habilitado:enabled,autorizaEnvioAutomatico:enabled},{timeout:15000});
   serverConfigured=enabled;
   const result=await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',extra:{rateioAutomationEnabled:enabled,rateioAutomationSolver:solver,rateioUsina:usinaId,rateioApi:String(response.config.baseURL??'').replace(/\/$/,''),rateioToken:session.token}});
   if(result.resultCode!==-1){await api.put(url,{habilitado:false});throw Error('O agendamento não foi confirmado no aparelho.');}
   setData((await api.get<Queue>(url)).data);
  }catch(e:any){
   if(serverConfigured){try{await api.put(url,{habilitado:false},{timeout:15000});setData({habilitado:false,itens:[]});}catch{setError('O aparelho não confirmou o agendamento e não foi possível desativar a fila. Confira a conexão e desative o teste.');return;}}
   setError(e?.message??'Não foi possível configurar o teste.');
  }finally{setBusy(false);}
 }
 function enable(solver:boolean){Alert.alert('Teste automático em segundo plano',`O Android consultará a fila periodicamente, com conexão disponível, inclusive após um reinício normal. Usa somente a planilha gerada após produção e todas as faturas. O acesso salvo será usado apenas na Cemig e o CSV será anexado para revisão. ${solver?'Autoriza uma verificação CapMonster por envio com desconto no saldo existente? O provedor recebe apenas URL e dados técnicos do desafio.':'Se aparecer CAPTCHA, o teste pausará sem consumir créditos.'} Sem compra ou recarga. O Preview bloqueia o protocolo definitivo. Ao sair da conta, a tarefa é cancelada.`,[{text:'Cancelar',style:'cancel'},{text:'Ativar teste',onPress:()=>void configure(true,solver)}]);}
 function prepare(){Alert.alert('Cópia técnica já conferida','Preparar na fila a cópia autorizada de OUT/2026, geradora 1121361801894, sem a UC fictícia 99999101128 e com a âncora atual 607081301889? Preserva os cadastros e o rateio original. O teste anexará somente para revisão, sem protocolo.',[{text:'Cancelar',style:'cancel'},{text:'Preparar cópia',onPress:()=>{setBusy(true);setError('');void api.post(`${url}/diagnostico`,{autorizaCopiaDiagnostica:true},{timeout:30000}).then(()=>setPrepared(true)).catch(()=>setError('Não foi possível preparar a cópia técnica autorizada.')).finally(()=>setBusy(false));}}]);}
 return <Card><View style={{gap:14}}>
  <Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Teste de automação em segundo plano</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22}}>Validação exclusiva do Preview. O Android decide o horário da execução; desligado, sem rede ou após forçar a parada, o envio não ocorre imediatamente. Nunca mostra um protocolo sem confirmação.</Text>
  <Text style={{color:Colors.text}}>{data?.habilitado?'Fila de teste habilitada no servidor. O agendamento neste aparelho é confirmado ao ativar. Confira os resultados abaixo.':'Teste não ativado.'}</Text>
  <Button title="Preparar cópia técnica já validada" disabled={busy||!data} onPress={prepare}/>
  {prepared?<Text style={{color:Colors.primary}}>Cópia preparada para o teste de segundo plano.</Text>:null}
  <Button title={data?.habilitado?'Reagendar neste aparelho sem CapMonster':'Ativar teste sem CapMonster'} disabled={busy||!data} onPress={()=>enable(false)}/>
  <Button title={data?.habilitado?'Reagendar neste aparelho com CapMonster':'Ativar teste com CapMonster'} disabled={busy||!data} onPress={()=>enable(true)}/>
  {data?.habilitado?<Button title="Desativar teste" disabled={busy} onPress={()=>void configure(false)}/>:null}
  <Button title="Consultar resultados" disabled={busy} onPress={()=>{setBusy(true);void api.get<Queue>(url,{timeout:15000}).then(r=>setData(r.data)).catch(()=>setError('Não foi possível consultar a fila.')).finally(()=>setBusy(false));}}/>
  {data?.itens.map(item=><Text key={item.id} style={{color:Colors.text}}>{item.competencia.slice(0,7)} · {item.estado}{item.protocolo?` · protocolo ${item.protocolo}`:''}</Text>)}
  {error?<Text accessibilityRole="alert" style={{color:Colors.text}}>{error}</Text>:null}
 </View></Card>;
}
