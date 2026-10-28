import {useState} from 'react';
import {Alert,Platform,Text,View} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';
import api from '../../config/api';
import {obterSessao} from '../../storage/session';

export default function CemigNativeBrowserProduction({usinaId,competencia}:{usinaId:string;competencia:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(isPreviewEnvironment||Platform.OS!=='android'||Number(Platform.Version)<26||Constants.expoConfig?.extra?.nativeCemigBrowser!==true)return null;
 async function open(){
  if(busy)return;setBusy(true);setError('');
  try{
   const configResponse=await api.get(`/usinas/${encodeURIComponent(usinaId)}/rateio-configuracao`,{timeout:15000});
   const config=configResponse.data;
   if(!config.uc_ancora)throw new Error('Selecione e confirme a UC âncora antes de preparar o envio.');
   const plano=(await api.post(`/usinas/${encodeURIComponent(usinaId)}/rateio-simulacao`,{
    competencia,ucAncora:config.uc_ancora,formatoCemig:true,numerosAtuaisConfirmados:config.numeros_confirmados===true,
   },{timeout:30000})).data;
   if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw new Error(plano.pendencias?.join('\n')||'O arquivo ainda tem pendências. Confira os dados da competência.');
   const geradora=String(plano.arquivo??'').match(/-(\d{6,20})\.csv$/)?.[1];
   if(!geradora)throw new Error('O arquivo não identifica a UC geradora. Nenhum envio foi iniciado.');
   const rows=String(plano.csv).trim().split(/\r?\n/).map(row=>row.split(';'));
   if(!rows.length||rows.some(row=>row.length!==4))throw new Error('O arquivo está fora do padrão Cemig.');
   const confirmed=await new Promise<boolean>(resolve=>Alert.alert('Conferir e preparar o rateio',
    `Competência: ${competencia}\nGeradora: ${geradora}\n\n${rows.map(row=>`${row[0]} — ${row[2]}%`).join('\n')}\n\nO aplicativo navegará e anexará este arquivo na Cemig após o login. A confirmação definitiva não é feita por esta autorização.`,
    [{text:'Cancelar',style:'cancel',onPress:()=>resolve(false)},{text:'Autorizar navegação e anexo',onPress:()=>resolve(true)}],
    {cancelable:true,onDismiss:()=>resolve(false)}));
   if(!confirmed)return;
   const session=await obterSessao();
   if(!session?.token)throw new Error('Entre novamente no Gerador antes de iniciar o envio.');
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
    packageName:'com.andradese.energy.gerador',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
    extra:{rateioCsv:plano.csv,rateioCompetencia:competencia,rateioUsina:usinaId,rateioGeradora:geradora,rateioApi:String(configResponse.config.baseURL??'').replace(/\/$/,''),rateioToken:session.token},
   });
  }catch(e:any){setError(e?.response?.data?.message??e?.message??'Não foi possível preparar o envio.');}
  finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Enviar pelo navegador integrado</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Confira as UCs e os percentuais no aplicativo e autorize a preparação. Após o login, o navegador integrado avança e anexa o arquivo automaticamente, parando na revisão. Abrir ou anexar o arquivo não confirma protocolo.</Text>
  <View style={{gap:14}}><Button style={{height:undefined,minHeight:56,paddingVertical:14}} title={busy?'Preparando arquivo real…':'Preparar arquivo real e abrir Cemig'} disabled={busy} onPress={()=>void open()}/></View>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
