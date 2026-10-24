import {useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {Button,Card} from './ui';
import {readContingency,switchContingency,setContingencyAutomation,prepareRenderReserve,type ContingencyState} from '../services/contingency.service';
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
  function changeAutomation(){if(!state?.automation)return;const active=!state.automation.ativa;
    Alert.alert(active?'Ativar troca automática?':'Desativar troca automática?',active?
      'O servidor reserva selecionado assumirá após o Render confirmar suspensão por cobrança em consultas consecutivas, desde que não existam operações pendentes. Lentidão ou falhas isoladas não acionam a troca. O retorno ao Render permanece manual.':
      'A entrada no reserva voltará a depender de confirmação manual do ADM.',[{text:'Cancelar',style:'cancel'},{text:'Confirmar',onPress:()=>{
        setBusy(true);setError('');void setContingencyAutomation(active).then(()=>readContingency()).then(setState)
          .catch(()=>setError('Não foi possível confirmar a configuração. Consulte novamente.')).finally(()=>setBusy(false));
      }}]);}
  function confirm(){if(!state)return;const reserve=state.control.executor==='RENDER';Alert.alert(
    reserve?'Confirmar cota esgotada':'Confirmar recuperação do Render',
    reserve?'Confirme no painel do Render que a cota gratuita acabou. Esta ação transfere o processamento ao reserva. Não use por lentidão ou erro isolado.':'Confirme que o serviço Render voltou a funcionar. A troca será bloqueada se houver operações pendentes.',
    [{text:'Cancelar',style:'cancel'},{text:reserve?'Cota esgotada: ativar':'Render recuperado: retornar',onPress:()=>void run(true)}]);}
  return <Card><View style={{gap:12}}>
    <Text style={{fontSize:18,fontWeight:'700',color:Colors.text}}>Servidor reserva</Text>
    <Text style={{color:Colors.text}}>A automação pode assumir por suspensão de cobrança confirmada pelo Render. A administração pode conferir o estado e controlar a troca manual.</Text>
    <Button title={busy?'Conferindo…':'Consultar contingência'} disabled={busy} onPress={()=>void run()}/>
    {state?<><Text style={{color:Colors.text}}>Servidor ativo: {state.control.executor==='RENDER'?'Render principal':state.control.executor==='RENDER_RESERVA'?'Render reserva':'Netlify'}</Text>
      {<><Text style={{color:Colors.text}}>Reserva selecionado: {state.control.reserva_preferida==='RENDER_RESERVA'?'Render reserva':'Netlify'}</Text>
        {state.control.reserva_preferida!=='RENDER_RESERVA'?<Button title="Selecionar Render reserva" disabled={busy||!state.control.render_reserva_commit_validado} onPress={()=>Alert.alert('Preparar Render reserva?','A seleção altera o destino das próximas trocas; o servidor principal continuará ativo.',[{text:'Cancelar',style:'cancel'},{text:'Selecionar',onPress:()=>{
          setBusy(true);setError('');void prepareRenderReserve(state).then(()=>readContingency()).then(setState)
            .catch(()=>setError('O reserva ainda precisa ser validado. Consulte novamente.')).finally(()=>setBusy(false));
        }}])}/>:null}
      </>}
      {state.automation?<><Text style={{color:Colors.text}}>Troca automática: {state.automation.ativa?'ativada':'desativada'}</Text>
        <Text style={{color:Colors.text}}>Retorno ao Render: confirmação manual do ADM.</Text>
        {state.automation.ultima_consulta?<Text style={{color:Colors.text}}>Última consulta: {new Date(state.automation.ultima_consulta).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</Text>:null}
        {state.automation.ativa&&(!state.automation.ultima_consulta||Date.now()-Date.parse(state.automation.ultima_consulta)>5*60_000||state.automation.ultimo_estado==='INDETERMINADO')?<Text style={{color:'#985418'}}>A consulta automática ainda não foi confirmada ou está indisponível. Confira a conexão antes de contar com a troca automática.</Text>:null}
        {!state.automation.configurada?<Text style={{color:'#985418'}}>A consulta do Render ainda não está conectada no reserva.</Text>:null}
        <Button title={state.automation.ativa?'Desativar troca automática':'Ativar troca automática'} disabled={busy||(!state.automation.ativa&&!state.automation.configurada)} onPress={changeAutomation}/>
      </>:null}
      {pending?<Text style={{color:'#985418'}}>Há operações em execução ou pendentes de revisão. A troca permanece bloqueada.</Text>:null}
      <Button title={state.control.executor==='RENDER'?'Ativar reserva…':'Retornar ao Render…'} disabled={busy||pending||(state.control.executor==='RENDER'&&!(state.control.reserva_preferida==='RENDER_RESERVA'?state.control.render_reserva_commit_validado:state.control.commit_validado))} onPress={confirm}/></>:null}
    {error?<Text accessibilityRole="alert" style={{color:'#A52B21'}}>{error}</Text>:null}
  </View></Card>;
}
