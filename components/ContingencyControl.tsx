import {useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {Button,Card} from './ui';
import {readContingency,switchContingency,type ContingencyState} from '../services/contingency.service';
import {Colors} from '../theme';

export default function ContingencyControl(){
  const [state,setState]=useState<ContingencyState|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function run(change=false){
    if(busy)return;setBusy(true);setError('');
    try{if(change&&state)await switchContingency(state);setState(await readContingency());}
    catch(e:any){setError(e?.response?.data?.message??'Não foi possível confirmar o estado. Consulte novamente antes de tentar uma troca.');}
    finally{setBusy(false);}
  }
  const pending=Boolean(state?.requests.length||state?.jobs.some(job=>['EXECUTANDO','REVISAO'].includes(job.estado)));
  function confirm(){if(!state)return;const reserve=state.control.executor==='RENDER';Alert.alert(
    reserve?'Confirmar cota esgotada':'Confirmar recuperação do Render',
    reserve?'Confirme no painel do Render que a cota gratuita acabou. Esta ação transfere o processamento ao reserva. Não use por lentidão ou erro isolado.':'Confirme que o serviço Render voltou a funcionar. A troca será bloqueada se houver operações pendentes.',
    [{text:'Cancelar',style:'cancel'},{text:reserve?'Cota esgotada: ativar':'Render recuperado: retornar',onPress:()=>void run(true)}]);}
  return <Card><View style={{gap:12}}>
    <Text style={{fontSize:18,fontWeight:'700',color:Colors.text}}>Servidor reserva</Text>
    <Text style={{color:Colors.text}}>Ativação exclusiva da administração da plataforma, após confirmar o esgotamento da cota do Render.</Text>
    <Button title={busy?'Conferindo…':'Consultar contingência'} disabled={busy} onPress={()=>void run()}/>
    {state?<><Text style={{color:Colors.text}}>Servidor ativo: {state.control.executor==='RENDER'?'Render':'Netlify'}</Text>
      {pending?<Text style={{color:'#985418'}}>Há operações em execução ou pendentes de revisão. A troca permanece bloqueada.</Text>:null}
      <Button title={state.control.executor==='RENDER'?'Ativar reserva…':'Retornar ao Render…'} disabled={busy||pending||!state.control.commit_validado} onPress={confirm}/></>:null}
    {error?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{error}</Text>:null}
  </View></Card>;
}
