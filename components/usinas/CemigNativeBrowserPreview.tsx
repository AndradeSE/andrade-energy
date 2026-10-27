import {useState} from 'react';
import {Platform,Text} from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import {Button,Card} from '../ui';
import {isPreviewEnvironment} from '../../config/environment';
import {Colors} from '../../theme';

export default function CemigNativeBrowserPreview(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const available=isPreviewEnvironment&&Platform.OS==='android'&&Number(Platform.Version)>=26&&Constants.expoConfig?.extra?.nativeCemigBrowser===true;
 if(!available)return null;
 async function open(){
  if(busy)return;setBusy(true);setError('');
  try{await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
   packageName:'com.andradese.energy.gerador.preview',className:'br.com.andradeenergy.cemig.CemigBrowserActivity',
  });}catch{setError('Este teste precisa do novo APK Preview com navegador integrado.');}finally{setBusy(false);}
 }
 return <Card><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Navegador integrado · Preview</Text>
  <Text style={{color:Colors.subtitle,lineHeight:22,marginVertical:12}}>Abre a Cemig dentro do aplicativo. A sessão mantém uma notificação por até 10 minutos e pode ser encerrada por ela. Nesta etapa, login e verificações são manuais; não há anexo ou protocolo automático.</Text>
  <Button title={busy?'Abrindo…':'Testar navegador integrado'} disabled={busy} onPress={()=>void open()}/>
  {error?<Text accessibilityRole="alert" style={{color:Colors.text,marginTop:12}}>{error}</Text>:null}
 </Card>;
}
