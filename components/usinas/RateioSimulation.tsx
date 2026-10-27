import {useRef,useState,useEffect} from 'react';
import {Text,TextInput,View} from 'react-native';
import {Button,Card} from '../ui';
import api from '../../config/api';
import {Colors} from '../../theme';

export default function RateioSimulation({usinaId,competencia}:{usinaId:string;competencia:string}) {
 const [ancora,setAncora]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[csv,setCsv]=useState('');
 const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function simulate(){
  if(busy)return;setBusy(true);setMessage('');setCsv('');
  try{const {data}=await api.post(`/usinas/${encodeURIComponent(usinaId)}/rateio-simulacao`,{competencia,ucAncora:ancora,formatoCemig:false,numerosAtuaisConfirmados:false});if(active.current){setCsv(data.csv);setMessage((data.pendencias??[]).join('\n')||'Simulação concluída para conferência.');}}
  catch(error:any){if(active.current)setMessage(error?.response?.data?.message??'Não foi possível simular. Tente novamente.');}
  finally{if(active.current)setBusy(false);}
 }
 return <View style={{gap:16}}><Card><Text style={{fontSize:22,fontWeight:'700',color:Colors.text}}>Simulação de rateio</Text><Text>Competência {competencia}. Usa os dados cadastrados somente para calcular um rascunho. Não altera preferências ou fechamento, não envia e-mail ou push e não acessa a Cemig.</Text><Text>UC âncora para este teste (opcional)</Text><TextInput accessibilityLabel="UC âncora da simulação" value={ancora} editable={!busy} keyboardType="number-pad" maxLength={20} onChangeText={value=>{setAncora(value.replace(/\D/g,''));setCsv('');}} style={{borderWidth:1,borderColor:Colors.primary,padding:12,borderRadius:12,color:Colors.text}}/><Button title={busy?'Simulando…':'Calcular simulação'} disabled={busy} onPress={()=>void simulate()}/><Text accessibilityLiveRegion="polite">{message}</Text></Card>{csv?<Card><Text style={{fontWeight:'700'}}>Rascunho da simulação · sem protocolo</Text><Text selectable style={{fontFamily:'monospace'}}>{csv}</Text></Card>:null}</View>;
}
