import {useState} from 'react';
import {Platform,Text} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';
import api from '../../config/api';

export default function CemigNativeBrowserPreview({usinaId,competencia}:{usinaId:string;competencia?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const available=isPreviewEnvironment&&Platform.OS==='android'&&Number(Platform.Version)>=26&&Constants.expoConfig?.extra?.nativeCemigBrowser===true;
 if(!available)return null;
 async function open(){
  if(busy)return;setBusy(true);setError('');
  try{
   if(!competencia)throw new Error('Selecione a competência.');
   const config=(await api.get(`/usinas/${usinaId}/rateio-configuracao`,{timeout:15000})).data;
   const plano=(await api.post(`/usinas/${usinaId}/rateio-simulacao`,{competencia,ucAncora:config.uc_ancora??'',formatoCemig:true},{timeout:30000})).data;
   if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw new Error('O CSV ainda tem pendências. Confira a âncora e os dados do rateio.');
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
   packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
   extra:{rateioCsv:plano.csv,rateioCompetencia:competencia,rateioUsina:usinaId},
  });}catch(e:any){setError(e?.response?.data?.message??e?.message??'Não foi possível preparar o CSV ou abrir o navegador.');}finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Navegador integrado · Preview</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Prepara o CSV da competência e abre a Cemig dentro do aplicativo, sem e-mail ou push de teste. Ao selecionar o anexo no portal, você confere o arquivo preparado. Login e verificações são manuais; nenhum protocolo será enviado por este teste.</Text>
  <Button title={busy?'Preparando…':'Preparar CSV e abrir navegador'} disabled={busy||!competencia} onPress={()=>void open()}/>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
