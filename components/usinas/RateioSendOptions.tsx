import {useEffect,useState} from 'react';
import {Alert,Linking,Modal,Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex,utf8ToBytes} from '@noble/hashes/utils';
import api from '../../config/api';
import {obterSessao} from '../../storage/session';
import {isPreviewEnvironment} from '../../config/environment';
import {buscarRateioAutomatico} from '../../services/usinas.service';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '../ui';
import {Pressable} from '../assistant/AssistantNativeControls';
import {Colors} from '../../theme';

type Mode='MANUAL'|'AUTORIZADO'|'AUTOMATICO';
const options:Record<Mode,{title:string;description:string;accept:string}>={
 MANUAL:{title:'Envio manual',description:'Você abre o CSV da competência, confere os dados e salva o arquivo. Ao aceitar, abrimos o Cemig Atende. Você entra na conta, anexa o CSV e conclui a solicitação no portal. Abrir o portal não envia o arquivo nem comprova protocolo.',accept:'Aceitar e abrir portal'},
 AUTORIZADO:{title:'Autorizar e enviar',description:'Quando a planilha estiver pronta, você confere a usina, a competência, as UCs, os percentuais e a âncora. Depois autoriza o robô a executar aquele envio. O resultado deve registrar o protocolo ou informar a falha; resultado incerto não permite repetir o envio automaticamente.',accept:'Aceitar e autorizar envio'},
 AUTOMATICO:{title:'Envio automático',description:'O Android consultará os rateios prontos após a produção da usina e todas as faturas das UCs vigentes. Usará o acesso salvo da Cemig, anexará o CSV e solicitará o cadastro. O protocolo só aparece após confirmação da Cemig. Em resultado incerto, o envio não será repetido. O Android decide o horário; sem rede, desligado ou após forçar parada, a execução aguarda. Sair da conta cancela o agendamento.',accept:'Aceitar e ativar envio automático'},
};
export default function RateioSendOptions({usinaId,competencia,disabled=false}:{usinaId:string;competencia?:string;disabled?:boolean}){
 const [mode,setMode]=useState<Mode>(),[opening,setOpening]=useState(false);
 const [queue,setQueue]=useState<{habilitado:boolean;modo?:string;itens?:{id:string;competencia:string;estado:string;protocolo?:string}[]}>();
 const nativeAvailable=!isPreviewEnvironment&&Platform.OS==='android'&&Constants.expoConfig?.extra?.nativeCemigAutomation===true;
 const queueUrl=`/usinas/${encodeURIComponent(usinaId)}/cemig-fila`;
 const insets=useSafeAreaInsets();
 useEffect(()=>{setMode(undefined);},[usinaId,competencia]);
 const option=mode?options[mode]:undefined;
 const available=mode==='MANUAL'||nativeAvailable;
 useEffect(()=>{setQueue(undefined);if(nativeAvailable)void api.get(queueUrl,{timeout:15000}).then(r=>setQueue(r.data)).catch(()=>{});},[nativeAvailable,queueUrl]);
 async function configure(enabled:boolean,authorizedHash?:string){
  const session=await obterSessao();if(!session?.token)throw Error('Entre novamente no Gerador.');
  const response=await api.put(queueUrl,{habilitado:enabled,autorizaEnvioAutomatico:enabled,modo:mode==='AUTORIZADO'?'AUTORIZADO':'AUTOMATICO',...(authorizedHash?{competencia,hash:authorizedHash}:{})},{timeout:15000});
  try{
   const result=await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{packageName:'com.andradese.energy.gerador',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',extra:{rateioAutomationEnabled:enabled,rateioAutomationSolver:enabled,rateioUsina:usinaId,rateioApi:String(response.config.baseURL??'').replace(/\/$/,''),rateioToken:session.token}});
   if(result.resultCode!==-1)throw Error('O agendamento não foi confirmado no aparelho.');
  }catch(e){if(enabled)await api.put(queueUrl,{habilitado:false},{timeout:15000});throw e;}
  setQueue((await api.get(queueUrl,{timeout:15000})).data);
 }
 function close(){if(!opening)setMode(undefined);}
 async function accept(){
  if(!available||opening)return;
  setOpening(true);
  try{
   if(mode==='MANUAL')await Linking.openURL('https://atende.cemig.com.br/Login');
   else{
    const vault=(await api.get(`/usinas/${encodeURIComponent(usinaId)}/cemig-acesso`,{timeout:15000})).data;
    if(vault.configurado!==true)throw Error('Cadastre o acesso da Cemig no aplicativo antes de ativar o envio.');
    let hash:string|undefined;
    if(mode==='AUTORIZADO'){
     if(!competencia)throw Error('Selecione a competência.');
     const plano=await buscarRateioAutomatico(usinaId,competencia);
     if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw Error('Aguarde o fechamento completo da competência e confira a planilha.');
     const rows=plano.csv.trim().split(/\r?\n/).map(row=>row.split(';'));
     const confirmed=await new Promise<boolean>(resolve=>Alert.alert('Autorizar este rateio',`Competência ${competencia}\n${rows.map(row=>`${row[0]} — ${row[2]}%${row[3]==='X'?' · âncora':''}`).join('\n')}\n\nO robô solicitará o cadastro deste arquivo na Cemig.`,[{text:'Cancelar',style:'cancel',onPress:()=>resolve(false)},{text:'Autorizar envio',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
     if(!confirmed)return;
     hash=bytesToHex(sha256(utf8ToBytes(plano.csv)));
    }
    await configure(true,hash);
   }
   setMode(undefined);
  }
  catch(e:any){Alert.alert('Envio não ativado',e?.response?.data?.message??e?.message??'Confira a conexão e tente novamente.');}
  finally{setOpening(false);}
 }
 return <View style={{gap:12}}><Text style={styles.title}>Envio à Cemig</Text><Text style={styles.text}>Escolha uma opção para ler como funciona antes de confirmar.</Text>
  {(Object.keys(options) as Mode[]).map(value=><Button key={value} title={options[value].title} disabled={disabled} onPress={()=>setMode(value)}/>)}
  {nativeAvailable&&queue?<><Text style={styles.text}>{queue.habilitado?`Envio ${queue.modo==='AUTORIZADO'?'autorizado desta competência':'automático'} habilitado neste cadastro.`:'Envio automático desativado.'}</Text>{queue.habilitado?<Button title="Desativar envio automático" disabled={opening} onPress={()=>{setOpening(true);void configure(false).catch(e=>Alert.alert('Não foi possível desativar',e?.message??'Confira a conexão.')).finally(()=>setOpening(false));}}/>:null}{queue.itens?.map(item=><Text key={item.id} style={styles.text}>{item.competencia.slice(0,7)} · {item.estado}{item.protocolo?` · protocolo ${item.protocolo}`:''}</Text>)}</>:null}
  <Modal visible={!!mode} transparent animationType="slide" onRequestClose={close}>
   <View style={styles.overlay}><View accessibilityViewIsModal style={[styles.sheet,{paddingBottom:Math.max(20,insets.bottom),marginTop:insets.top+24}]}>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:18,paddingBottom:8}}>
     <Text accessibilityRole="header" style={styles.title}>{option?.title}</Text>
     <Text style={styles.text}>Competência {competencia?.replace(/^(\d{4})-(\d{2})$/,'$2/$1')??'não selecionada'}</Text>
     <Text style={styles.text}>{option?.description}</Text>
     {mode&&mode!=='MANUAL'&&nativeAvailable?<Text style={styles.text}>Autoriza usar o acesso salvo somente na Cemig e uma resolução CapMonster por execução, se necessária, descontada do saldo existente? O CapMonster recebe apenas URL e dados técnicos do desafio. Sem compra ou recarga. Se não houver saldo/configuração ou a Cemig exigir outra verificação, o app avisa e pausa para sua intervenção.</Text>:null}
     {!available?<Text accessibilityRole="alert" style={styles.notice}>Ainda em validação: o envio definitivo e o registro de protocolo pelo robô não estão disponíveis. Nenhuma autorização será salva ou ativada por esta tela.</Text>:null}
     <Button title={opening?'Abrindo portal…':option?.accept??'Aceitar'} disabled={!available||opening} onPress={()=>void accept()}/>
     <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" disabled={opening} onPress={close} style={styles.cancel}><Text style={{color:Colors.primary,fontWeight:'700'}}>Cancelar</Text></Pressable>
    </ScrollView>
   </View></View>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({title:{fontSize:20,fontWeight:'700',color:Colors.text},text:{color:Colors.subtitle,lineHeight:23},notice:{backgroundColor:'#FFF5DF',color:Colors.text,padding:16,borderRadius:12,lineHeight:23},overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.4)'},sheet:{maxHeight:'90%',backgroundColor:Colors.surface,padding:20,borderTopLeftRadius:24,borderTopRightRadius:24},cancel:{minHeight:48,alignItems:'center',justifyContent:'center'}});
