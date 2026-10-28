import {useState} from 'react';
import {Alert,Platform,Text,View} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';
import {copiaCsvDiagnostico} from '../../services/cemig-csv-diagnostico.cjs';
import api from '../../config/api';
import {obterSessao} from '../../storage/session';

export default function CemigNativeBrowserPreview({usinaId,competencia}:{usinaId:string;competencia?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const available=isPreviewEnvironment&&Platform.OS==='android'&&Number(Platform.Version)>=26&&Constants.expoConfig?.extra?.nativeCemigBrowser===true;
 if(!available)return null;
 async function open(copiaTeste=false){
  if(busy)return;setBusy(true);setError('');
  try{
   if(!competencia)throw new Error('Selecione a competência.');
   const configResponse=await api.get(`/usinas/${usinaId}/rateio-configuracao`,{timeout:15000});
   const config=configResponse.data;
   const plano=(await api.post(`/usinas/${usinaId}/rateio-simulacao`,{competencia,ucAncora:config.uc_ancora??'',formatoCemig:true},{timeout:30000})).data;
   if(plano.rascunho||!plano.formatoCemig||!plano.csv||plano.pendencias?.length)throw new Error('O CSV ainda tem pendências. Confira a âncora e os dados do rateio.');
   const csv=copiaTeste?copiaCsvDiagnostico(plano.csv,'99999101128','3006605532','607081301889').csv:plano.csv;
   if(copiaTeste&&(competencia!=='2026-10'||config.uc_ancora!=='3006605532'))throw new Error('Esta cópia técnica foi autorizada somente para OUT/2026 e a âncora 3006605532.');
   const session=await obterSessao();
   const solver=await new Promise<boolean|null>(resolve=>Alert.alert('Acesso da Cemig nesta sessão',
    'O navegador integrado pode usar o acesso já cadastrado no cofre. Se autorizar o CapMonster, enviará somente os dados técnicos do reCAPTCHA e usará o saldo já disponível para uma única tentativa, sem compra de créditos nem recarga. O Preview bloqueia o protocolo definitivo.',
    [{text:'Cancelar',style:'cancel',onPress:()=>resolve(null)},{text:'Somente acesso salvo',onPress:()=>resolve(false)},{text:'Acesso e uma verificação automática',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(null)}));
   if(solver===null)return;
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
   packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
   extra:{rateioCsv:csv,rateioCompetencia:competencia,rateioUsina:usinaId,rateioGeradora:String(plano.arquivo??'').match(/-(\d{6,20})\.csv$/)?.[1]??'',rateioSolver:solver,...(session?.token?{rateioApi:String(configResponse.config.baseURL??'').replace(/\/$/,''),rateioToken:session.token}:{})},
  });}catch(e:any){setError(e?.response?.data?.message??e?.message??'Não foi possível preparar o CSV ou abrir o navegador.');}finally{setBusy(false);}
 }
 async function openReference(){
  if(busy)return;setBusy(true);setError('');
  try{
   const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','text/comma-separated-values','application/octet-stream'],copyToCacheDirectory:true,multiple:false});
   if(picked.canceled)return;
   const file=picked.assets[0];
   const match=file.name.match(/^cemig-simulacao-sem-uc-ficticia-(20\d{2}-(?:0[1-9]|1[0-2]))-(\d{6,20})\.csv$/);
   if(!match||match[1]!==competencia||file.size===undefined||file.size>100000)throw new Error('Selecione o CSV de referência desta competência, com UC geradora identificada no nome.');
   const csv=await FileSystem.readAsStringAsync(file.uri,{encoding:FileSystem.EncodingType.UTF8});
   if(!csv||csv.split(/\r?\n/).some(row=>row.split(';').length!==4))throw new Error('Arquivo de referência fora do padrão.');
   await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
    packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
    extra:{rateioCsv:csv,rateioCompetencia:match[1],rateioUsina:usinaId,rateioGeradora:match[2]},
   });
  }catch(e:any){setError(e?.message??'Não foi possível abrir o CSV de referência.');}finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Navegador integrado · Preview</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Prepara o CSV e abre a Cemig no aplicativo usando o acesso salvo. Você pode autorizar uma verificação pelo CapMonster com o saldo disponível ou resolver manualmente. Após o login, o robô continua até a revisão do arquivo. Se o portal mudar ou os dados não forem inequívocos, o fluxo pausa e explica a etapa. O anexo exige sua conferência; o Preview bloqueia o protocolo definitivo.</Text>
  <View style={{gap:14,marginTop:4}}>
  <Button style={{height:undefined,minHeight:56,paddingVertical:14}} title={busy?'Preparando…':'Preparar CSV e abrir navegador'} disabled={busy||!competencia} onPress={()=>void open()}/>
  {competencia==='2026-10'?<Button style={{height:undefined,minHeight:56,paddingVertical:14}} title="Abrir cópia de teste sem UC fictícia" disabled={busy} onPress={()=>void open(true)}/>:null}
  <Text style={{color:Colors.subtitle,lineHeight:20,marginTop:8}}>A cópia técnica retira a UC fictícia e transfere sua cota à âncora, usando o número atual 607081301889 informado pelo titular. Não altera os cadastros nem a planilha original; protocolo bloqueado.</Text>
  <Button style={{height:undefined,minHeight:56,paddingVertical:14}} title="Testar arquivo CSV já validado" disabled={busy} onPress={()=>void openReference()}/>
  <Text style={{color:Colors.subtitle}}>Somente diagnóstico: usa a UC geradora indicada no arquivo, sem alterar a configuração desta usina.</Text>
  </View>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
