import {useState} from 'react';
import {Platform,Text} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';
import {copiaCsvDiagnostico} from '../../services/cemig-csv-diagnostico.cjs';
import api from '../../config/api';

export default function CemigNativeBrowserPreview({usinaId,competencia}:{usinaId:string;competencia?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const available=isPreviewEnvironment&&Platform.OS==='android'&&Number(Platform.Version)>=26&&Constants.expoConfig?.extra?.nativeCemigBrowser===true;
 if(!available)return null;
 async function open(copiaTeste=false){
  if(busy)return;setBusy(true);setError('');
  try{
   if(!competencia)throw new Error('Selecione a competência.');
   const config=(await api.get(`/usinas/${usinaId}/rateio-configuracao`,{timeout:15000})).data;
   const plano=(await api.post(`/usinas/${usinaId}/rateio-simulacao`,{competencia,ucAncora:config.uc_ancora??'',formatoCemig:true},{timeout:30000})).data;
   if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw new Error('O CSV ainda tem pendências. Confira a âncora e os dados do rateio.');
   const csv=copiaTeste?copiaCsvDiagnostico(plano.csv,'99999101128','3006605532').csv:plano.csv;
   if(copiaTeste&&(competencia!=='2026-10'||config.uc_ancora!=='3006605532'))throw new Error('Esta cópia técnica foi autorizada somente para OUT/2026 e a âncora 3006605532.');
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
   packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
   extra:{rateioCsv:csv,rateioCompetencia:competencia,rateioUsina:usinaId,rateioGeradora:String(plano.arquivo??'').match(/-(\d{6,20})\.csv$/)?.[1]??''},
  });}catch(e:any){setError(e?.response?.data?.message??e?.message??'Não foi possível preparar o CSV ou abrir o navegador.');}finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Navegador integrado · Preview</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Prepara o CSV e abre a Cemig no aplicativo. Após entrar, toque em Continuar rateio para avançar na mesma sessão. Se o portal mudar ou os dados não forem inequívocos, o fluxo pausa e explica a etapa. O anexo exige sua conferência. Login e verificações são manuais nesta versão; o Preview bloqueia o protocolo.</Text>
  <Button title={busy?'Preparando…':'Preparar CSV e abrir navegador'} disabled={busy||!competencia} onPress={()=>void open()}/>
  {competencia==='2026-10'?<Button title="Abrir cópia de teste sem UC fictícia" disabled={busy} onPress={()=>void open(true)}/>:null}
  <Text style={{color:Colors.subtitle,lineHeight:20,marginTop:8}}>A cópia técnica retira somente a UC 99999101128 e transfere sua cota à âncora 3006605532. Não altera os cadastros nem a planilha original; protocolo bloqueado.</Text>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
