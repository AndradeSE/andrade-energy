import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AppHeader, Button, Card, Screen } from '../../components/ui';
import { Pressable } from '../../components/assistant/AssistantNativeControls';
import RateioMensalCard from '../../components/usinas/RateioMensalCard';
import { useAuth } from '../../contexts/AuthContext';
import { obterResumoOperacao } from '../../services/fechamentos.service';
import { buscarUsina } from '../../services/usinas.service';
import { Colors } from '../../theme';

export default function RateioOperacao() {
  const { user, usinaSelecionada } = useAuth();
  const params = useLocalSearchParams<{competencia?:string;usinaId?:string}>();
  const [mes,setMes] = useState<string|undefined>(typeof params.competencia==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(params.competencia)?params.competencia:undefined);
  const papel=String(user?.papel_empresa??'');
  const permitido=papel==='COLABORADOR_COMERCIAL'?user?.permissoes?.gerador_operacao===true:papel==='COLABORADOR_GERADOR'?user?.permissoes?.operacao===true:true;
  useEffect(()=>{if(typeof params.competencia==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(params.competencia))setMes(params.competencia);},[params.competencia]);
  const alvo=typeof params.usinaId==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(params.usinaId)?params.usinaId:undefined;
  const id=alvo??usinaSelecionada?.id;
  // A notification can belong to a different plant. Resolve it through the
  // authenticated API instead of showing the currently selected plant's data.
  const usinaAviso=useQuery({queryKey:['rateio-usina-aviso',user?.id,user?.empresa_id,alvo],enabled:!!alvo&&permitido,queryFn:()=>buscarUsina(alvo!)});
  const acessoConfirmado=!alvo||usinaAviso.data?.id===alvo;
  const nome=alvo?usinaAviso.data?.nome:usinaSelecionada?.nome;
  const resumo=useQuery({queryKey:['rateio-competencias',user?.empresa_id,id,mes],enabled:!!id&&permitido&&acessoConfirmado,queryFn:()=>obterResumoOperacao(mes,id!)});
  const competencia=mes??resumo.data?.competencia;
  return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Rateio" subtitle="Operação da usina" contextTitle="Planilha mensal de rateio" contextSubtitle={nome??(alvo?'Usina do aviso':'Selecione uma usina')} icon="git-merge-outline"/>
    <ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:40}} keyboardShouldPersistTaps="handled">
      {!permitido?<Card><Text>Seu acesso à operação não foi liberado pelo titular.</Text></Card>:!id?<Card><Text>Escolha uma usina para consultar o rateio.</Text><Button title="Selecionar usina" onPress={()=>router.push('/selecionar-unidade')}/></Card>:!acessoConfirmado?<Card><Text>{usinaAviso.isError?'Não foi possível acessar a usina deste aviso.':'Conferindo a usina deste aviso…'}</Text>{usinaAviso.isError?<Button title="Tentar novamente" onPress={()=>void usinaAviso.refetch()}/>:null}</Card>:<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {[...new Set([...(resumo.data?.competencias??[]),...(competencia?[competencia]:[])])].sort().map((item:string)=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:item===competencia}} onPress={()=>setMes(item)} style={{padding:12,borderRadius:24,backgroundColor:item===competencia?Colors.primary:Colors.surface}}><Text style={{color:item===competencia?'#fff':Colors.text}}>{item.slice(5,7)}/{item.slice(0,4)}</Text></Pressable>)}
        </ScrollView>
        {resumo.isError?<Card><Text>Não foi possível consultar as competências.</Text><Button title="Tentar novamente" onPress={()=>void resumo.refetch()}/></Card>:competencia?<RateioMensalCard key={id} usinaId={id} empresaId={String(user?.empresa_id??'')} competencia={competencia}/>:<View><Text>Consultando competência…</Text></View>}
      </>}
    </ScrollView>
  </Screen>;
}
