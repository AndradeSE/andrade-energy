import {useEffect,useState} from 'react';
import {Alert,Linking,Modal,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '../ui';
import {Pressable} from '../assistant/AssistantNativeControls';
import {Colors} from '../../theme';

type Mode='MANUAL'|'AUTORIZADO'|'AUTOMATICO';
const options:Record<Mode,{title:string;description:string;accept:string}>={
 MANUAL:{title:'Envio manual',description:'Você abre o CSV da competência, confere os dados e salva o arquivo. Ao aceitar, abrimos o Cemig Atende. Você entra na conta, anexa o CSV e conclui a solicitação no portal. Abrir o portal não envia o arquivo nem comprova protocolo.',accept:'Aceitar e abrir portal'},
 AUTORIZADO:{title:'Autorizar e enviar',description:'Quando a planilha estiver pronta, você confere a usina, a competência, as UCs, os percentuais e a âncora. Depois autoriza o robô a executar aquele envio. O resultado deve registrar o protocolo ou informar a falha; resultado incerto não permite repetir o envio automaticamente.',accept:'Aceitar e autorizar envio'},
 AUTOMATICO:{title:'Envio automático',description:'Após uma configuração prévia, o envio ocorreria quando a produção da usina e todas as faturas das UCs vigentes estivessem processadas. Isso é diferente da geração automática da planilha. O robô precisaria registrar o protocolo e pausar caso a Cemig exigisse verificação humana.',accept:'Aceitar e ativar envio automático'},
};
export default function RateioSendOptions({usinaId,competencia,disabled=false}:{usinaId:string;competencia?:string;disabled?:boolean}){
 const [mode,setMode]=useState<Mode>(),[opening,setOpening]=useState(false);
 const insets=useSafeAreaInsets();
 useEffect(()=>{setMode(undefined);},[usinaId,competencia]);
 const option=mode?options[mode]:undefined;
 const available=mode==='MANUAL';
 function close(){if(!opening)setMode(undefined);}
 async function accept(){
  if(!available||opening)return;
  setOpening(true);
  try{await Linking.openURL('https://atende.cemig.com.br/Login');setMode(undefined);}
  catch{Alert.alert('Não foi possível abrir o portal','Acesse https://atende.cemig.com.br/Login no navegador. Nenhum rateio foi enviado.');}
  finally{setOpening(false);}
 }
 return <View style={{gap:12}}><Text style={styles.title}>Envio à Cemig</Text><Text style={styles.text}>Escolha uma opção para ler como funciona antes de confirmar.</Text>
  {(Object.keys(options) as Mode[]).map(value=><Button key={value} title={options[value].title} disabled={disabled} onPress={()=>setMode(value)}/>)}
  <Modal visible={!!mode} transparent animationType="slide" onRequestClose={close}>
   <View style={styles.overlay}><View accessibilityViewIsModal style={[styles.sheet,{paddingBottom:Math.max(20,insets.bottom),marginTop:insets.top+24}]}>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:18,paddingBottom:8}}>
     <Text accessibilityRole="header" style={styles.title}>{option?.title}</Text>
     <Text style={styles.text}>Competência {competencia?.replace(/^(\d{4})-(\d{2})$/,'$2/$1')??'não selecionada'}</Text>
     <Text style={styles.text}>{option?.description}</Text>
     {!available?<Text accessibilityRole="alert" style={styles.notice}>Ainda em validação: o envio definitivo e o registro de protocolo pelo robô não estão disponíveis. Nenhuma autorização será salva ou ativada por esta tela.</Text>:null}
     <Button title={opening?'Abrindo portal…':option?.accept??'Aceitar'} disabled={!available||opening} onPress={()=>void accept()}/>
     <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" disabled={opening} onPress={close} style={styles.cancel}><Text style={{color:Colors.primary,fontWeight:'700'}}>Cancelar</Text></Pressable>
    </ScrollView>
   </View></View>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({title:{fontSize:20,fontWeight:'700',color:Colors.text},text:{color:Colors.subtitle,lineHeight:23},notice:{backgroundColor:'#FFF5DF',color:Colors.text,padding:16,borderRadius:12,lineHeight:23},overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.4)'},sheet:{maxHeight:'90%',backgroundColor:Colors.surface,padding:20,borderTopLeftRadius:24,borderTopRightRadius:24},cancel:{minHeight:48,alignItems:'center',justifyContent:'center'}});
