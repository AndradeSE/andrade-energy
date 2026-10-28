import {useState} from 'react';
import {Platform,Text,View} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';
import api from '../../config/api';

export default function CemigNativeBrowserProduction({usinaId,competencia}:{usinaId:string;competencia:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(isPreviewEnvironment||Platform.OS!=='android'||Number(Platform.Version)<26||Constants.expoConfig?.extra?.nativeCemigBrowser!==true)return null;
 async function open(){
  if(busy)return;setBusy(true);setError('');
  try{
   const config=(await api.get(`/usinas/${encodeURIComponent(usinaId)}/rateio-configuracao`,{timeout:15000})).data;
   if(!config.uc_ancora)throw new Error('Selecione e confirme a UC âncora antes de preparar o envio.');
   const plano=(await api.post(`/usinas/${encodeURIComponent(usinaId)}/rateio-simulacao`,{
    competencia,ucAncora:config.uc_ancora,formatoCemig:true,numerosAtuaisConfirmados:config.numeros_confirmados===true,
   },{timeout:30000})).data;
   if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw new Error(plano.pendencias?.join('\n')||'O arquivo ainda tem pendências. Confira os dados da competência.');
   const geradora=String(plano.arquivo??'').match(/-(\d{6,20})\.csv$/)?.[1];
   if(!geradora)throw new Error('O arquivo não identifica a UC geradora. Nenhum envio foi iniciado.');
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
    packageName:'com.andradese.energy.gerador',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
    extra:{rateioCsv:plano.csv,rateioCompetencia:competencia,rateioUsina:usinaId,rateioGeradora:geradora},
   });
  }catch(e:any){setError(e?.response?.data?.message??e?.message??'Não foi possível preparar o envio.');}
  finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Enviar pelo navegador integrado</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Usa as UCs e a âncora cadastradas nesta usina para a competência selecionada. Entre na Cemig e toque em Continuar rateio. O robô prepara o anexo e para na revisão. Confira os dados antes de concluir a solicitação no portal. Abrir ou anexar o arquivo não confirma protocolo.</Text>
  <View style={{gap:14}}><Button style={{height:undefined,minHeight:56,paddingVertical:14}} title={busy?'Preparando arquivo real…':'Preparar arquivo real e abrir Cemig'} disabled={busy} onPress={()=>void open()}/></View>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
