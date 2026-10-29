import {useEffect,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {TouchableOpacity} from '../assistant/AssistantNativeControls';
import api from '../../config/api';
import {Colors,Spacing} from '../../theme';

export default function RateioUcControl({id,podeEditar}:{id:string;podeEditar:boolean}){
 const [estado,setEstado]=useState<{ativo:boolean;contratoVigente:boolean;suspensoInadimplencia:boolean}|null>(null);
 const [ocupado,setOcupado]=useState(false);
 useEffect(()=>{let valido=true;setEstado(null);api.get(`/clientes/unidade/${id}/rateio`).then(r=>{if(valido)setEstado(r.data);}).catch(()=>{});return()=>{valido=false;};},[id]);
 function alterar(){
  if(!estado||ocupado)return;
  const ativo=!estado.ativo;
  Alert.alert(ativo?'Ativar rateio desta UC?':'Desativar rateio desta UC?',ativo?'A UC volta a participar dos próximos rateios, desde que esteja regularizada.':'A UC será retirada dos próximos rateios e a sobra seguirá para a âncora. Protocolos já enviados não são alterados.',[
   {text:'Cancelar',style:'cancel'},
   {text:ativo?'Ativar':'Desativar',onPress:async()=>{setOcupado(true);try{const r=await api.put(`/clientes/unidade/${id}/rateio`,{ativo});setEstado(r.data);}catch{Alert.alert('Não foi possível alterar','Tente novamente.');}finally{setOcupado(false);}}},
  ]);
 }
 return <View style={{gap:Spacing.sm,paddingVertical:Spacing.md}}>
  <Text style={{color:Colors.subtitle,fontWeight:'700'}}>{!estado?'Rateio: status indisponível':!estado.contratoVigente?'Rateio desativado · sem contrato vigente':!estado.ativo?'Rateio desativado':estado.suspensoInadimplencia?'Rateio desativado · inadimplência':'Rateio ativado'}</Text>
  {podeEditar&&estado?.contratoVigente?<TouchableOpacity disabled={ocupado} accessibilityRole="button" onPress={alterar} style={{backgroundColor:Colors.primary,padding:Spacing.md,borderRadius:14,alignItems:'center',opacity:ocupado?0.6:1}}><Text style={{color:'#fff',fontWeight:'700'}}>{ocupado?'Salvando…':estado.ativo?'Desativar rateio da UC':'Ativar rateio da UC'}</Text></TouchableOpacity>:null}
 </View>;
}
