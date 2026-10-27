import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "../assistant/AssistantNativeControls";
import { Button, Card } from "../ui";
import UcAncoraSelector from './UcAncoraSelector';
import { gerarPlanilhaRateio,obterConfiguracaoRateio,salvarConfiguracaoRateio,buscarRateioAutomatico,type ConfiguracaoRateio } from "../../services/usinas.service";
import { Colors, Spacing } from "../../theme";
import {obterSaldoAncora,type SaldoAncora} from "../../services/usinas.service";
import CemigCloudSimulation from './CemigCloudSimulation';
import RateioFileViewer from './RateioFileViewer';
import CemigCredentialVault from './CemigCredentialVault';
import {useAuth} from '../../contexts/AuthContext';
import {canViewServiceQuotas} from '../../utils/service-quota-access';
import {isPreviewEnvironment} from '../../config/environment';

export default function RateioMensalCard({usinaId,empresaId,competencia}: {usinaId:string;empresaId:string;competencia?:string}) {
  const {usuario}=useAuth();
  const [vaultConfigured,setVaultConfigured]=useState(false);
  const [visualizando,setVisualizando]=useState(false);
  const [ajustes,setAjustes]=useState(false);
  const [detalhes,setDetalhes]=useState(false);
  const [revisaoAberta,setRevisaoAberta]=useState(false);
  const [arquivoAberto,setArquivoAberto]=useState(false);
  const [envioAberto,setEnvioAberto]=useState(false);
  const [ancora,setAncora]=useState("");
  const [numerosAtuaisConfirmados,setNumerosAtuaisConfirmados]=useState(false);
  const [ocupado,setOcupado]=useState(false);
  const [resultado,setResultado]=useState<Awaited<ReturnType<typeof gerarPlanilhaRateio>>>();
  const [config,setConfig]=useState<ConfiguracaoRateio>();
  const [erroConfig,setErroConfig]=useState(false);
  const [saldoAncora,setSaldoAncora]=useState<SaldoAncora>();
  const [erroSaldo,setErroSaldo]=useState(false);
  const [consultandoSaldo,setConsultandoSaldo]=useState(false);
  const [revisaoSaldo,setRevisaoSaldo]=useState(0);
  const chave=`rateio:ancora:${empresaId}:${usinaId}`;
  const escopo=useRef("");
  escopo.current=`${chave}:${competencia}`;
  useEffect(()=>{let ativo=true;setAncora("");setNumerosAtuaisConfirmados(false);setResultado(undefined);setConfig(undefined);setErroConfig(false);void obterConfiguracaoRateio(usinaId).then(async c=>{const local=await AsyncStorage.getItem(chave);if(ativo){setConfig(c);setAncora(c.uc_ancora||local||"");setNumerosAtuaisConfirmados(c.numeros_confirmados);}}).catch(()=>{if(ativo)setErroConfig(true);});return()=>{ativo=false;};},[chave,usinaId]);
  useEffect(()=>{setResultado(undefined);setVisualizando(false);},[competencia]);
  useEffect(()=>{
    let ativo=true;setSaldoAncora(undefined);setErroSaldo(false);
    if(!competencia||!config)return;
    setConsultandoSaldo(true);
    const timer=setTimeout(()=>void obterSaldoAncora(usinaId,ancora,competencia).then(s=>{if(ativo)setSaldoAncora(s);}).catch(()=>{if(ativo)setErroSaldo(true);}).finally(()=>{if(ativo)setConsultandoSaldo(false);}),350);
    return()=>{ativo=false;clearTimeout(timer);};
  },[usinaId,empresaId,ancora,competencia,config,revisaoSaldo]);
  async function salvarAuto(){
    const pedido=escopo.current;setOcupado(true);
    try{const c=await salvarConfiguracaoRateio(usinaId,ancora,numerosAtuaisConfirmados);if(pedido===escopo.current){setConfig(c);setErroConfig(false);Alert.alert("Rateio automático configurado","A âncora salva vale para esta usina em todos os aparelhos. O sistema aguardará a produção e todas as faturas das UCs vigentes.");}}
    catch(e:any){Alert.alert("Não foi possível salvar",e?.response?.data?.message??"Tente novamente.");}finally{setOcupado(false);}
  }
  async function baixarAuto(){if(!competencia||ocupado)return;const pedido=escopo.current;setOcupado(true);try{const plano=await buscarRateioAutomatico(usinaId,competencia);if(pedido!==escopo.current)return;setResultado(plano);setVisualizando(true);}catch(e:any){Alert.alert("Rateio automático",e?.response?.data?.message??e.message??"Tente novamente.");}finally{setOcupado(false);}}
  async function gerar() {
    if(!competencia||ocupado)return;
    const pedido=escopo.current;
    setOcupado(true);
    try {
      const plano=await gerarPlanilhaRateio(usinaId,competencia,ancora,true,{numerosAtuaisConfirmados,formatoCemig:!!ancora&&numerosAtuaisConfirmados});
      if(pedido!==escopo.current)return;
      setResultado(plano);
      await AsyncStorage.setItem(chave,ancora);
      if(!plano.emailEnviado)Alert.alert("E-mail não confirmado","A planilha foi gerada, mas o envio ao gerador não foi confirmado. Você pode ler e salvar o arquivo.");
      setVisualizando(true);
    }catch(e:any){if(pedido===escopo.current)Alert.alert("Não foi possível gerar o rateio",e?.response?.data?.message??e.message??"Tente novamente.");}
    finally{setOcupado(false);}
  }
  return <><RateioFileViewer arquivo={visualizando?resultado:undefined} onClose={()=>setVisualizando(false)}/><Card><View style={{gap:Spacing.sm}}>
    <Text style={{fontSize:18,fontWeight:"700",color:Colors.text}}>Rateio mensal</Text>
    <Text style={{color:Colors.subtitle}}>Planilha da competência {competencia?.replace(/^(\d{4})-(\d{2})$/, "$2/$1") ?? "selecionada"}. Configuração salva para os próximos meses.</Text>
    <View style={{backgroundColor:"#EFF7F2",borderRadius:12,padding:16,gap:6}} accessibilityLabel="Saldo acumulado da UC âncora">
      <Text style={{fontWeight:"700",color:Colors.text}}>Saldo acumulado da UC âncora</Text>
      <Text style={{fontSize:24,fontWeight:"700",color:Colors.primary,flexShrink:1}}>{consultandoSaldo?"Consultando…":erroSaldo?"Consulta indisponível":saldoAncora?.saldoKwh!=null?`${saldoAncora.saldoKwh.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh`:"Saldo não informado"}</Text>
      {saldoAncora?<Text style={{color:Colors.subtitle}}>UC {saldoAncora.uc}{!ancora?" · geradora (âncora sugerida)":""}{saldoAncora.referencia?` · referência ${saldoAncora.referencia.slice(5,7)}/${saldoAncora.referencia.slice(0,4)}`:""}</Text>:null}
      {detalhes?<Text style={{color:Colors.subtitle}}>Saldo total informado pela Cemig, incluindo créditos de outras usinas, como GD1. A injeção recebida não é somada novamente; o rateio previsto ainda não compõe este saldo.</Text>:null}
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar saldo da UC âncora" disabled={consultandoSaldo} onPress={()=>setRevisaoSaldo(v=>v+1)} style={{minHeight:44,justifyContent:"center"}}><Text style={{color:Colors.primary,fontWeight:"700"}}>Atualizar saldo</Text></Pressable>
      {!consultandoSaldo&&!erroSaldo&&saldoAncora?.saldoKwh==null?<Text style={{color:Colors.subtitle}}>Importe uma fatura que informe o saldo de créditos para atualizar este indicador.</Text>:null}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:detalhes}} onPress={()=>setDetalhes(v=>!v)} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:8}}><Ionicons name="information-circle-outline" size={20} color={Colors.primary}/><Text style={{color:Colors.primary}}>Como é calculado?</Text></Pressable>
    {detalhes?<Text style={{color:Colors.subtitle}}>(Consumo médio − saldo de créditos da UC) ÷ produção média real da usina × 100, sem adicional e com mínimo de zero. O restante fica na UC âncora. Recalcule a cada competência antes de solicitar a alteração à Cemig.</Text>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:ajustes}} onPress={()=>setAjustes(v=>!v)} style={{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={{fontWeight:"700",color:Colors.text}}>Configurações do rateio</Text><Ionicons name={ajustes?"chevron-up":"chevron-down"} size={20} color={Colors.primary}/></Pressable>
    <View style={{display:ajustes?"flex":"none",gap:Spacing.sm}}><UcAncoraSelector usinaId={usinaId} empresaId={empresaId} value={ancora} disabled={ocupado} onChange={v=>{setAncora(v);setNumerosAtuaisConfirmados(false);setResultado(undefined);}} />
    <Text style={{color:Colors.subtitle}}>Use o número atual da UC. Sem âncora, gera rascunho. Titulares, documentos e e-mail vêm dos cadastros existentes.</Text>
    <Opcao label="Conferi os números atuais das UCs" checked={numerosAtuaisConfirmados} disabled={ocupado} onPress={()=>setNumerosAtuaisConfirmados(v=>!v)} />
    <Button title="Salvar configuração do rateio automático" disabled={ocupado} onPress={()=>void salvarAuto()} />
    {isPreviewEnvironment&&canViewServiceQuotas(usuario)?<CemigCredentialVault usinaId={usinaId} onConfigured={setVaultConfigured}/>:null}
    </View>
    <Text style={{color:Colors.subtitle}}>{erroConfig?"Não foi possível consultar a automação. Tente salvar a configuração novamente.":config?.habilitado?"Automático: aguarda produção + faturas de todas as UCs vigentes. Ao gerar, envia e-mail e aviso ao gerador.":"Consultando configuração automática…"}</Text>
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="GERADO"?<Button title="Abrir planilha gerada automaticamente" disabled={ocupado} onPress={()=>void baixarAuto()} />:null}
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="ERRO"?<Text style={{color:Colors.subtitle}}>Não foi possível concluir a geração automática. {config.registros.find(r=>r.competencia.slice(0,7)===competencia)?.erro}</Text>:null}
    {resultado?<><Text style={{color:Colors.primary,fontWeight:"700"}}>{resultado.rascunho?"Rascunho para conferência":"CSV no padrão Cemig"}</Text><SecaoRateio titulo="Conferência dos dados" resumo={`${resultado.pendencias?.length??0} pendência(s) · base ${resultado.producaoMedia.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh/mês`} aberto={revisaoAberta} onPress={()=>setRevisaoAberta(v=>!v)}/></>:null}
    {resultado&&revisaoAberta?<View style={{gap:8}}>
    <Text style={{color:Colors.subtitle}}>Média baseada em {resultado.mesesNaMedia} mês(es). {resultado.ucsExcluidas?`${resultado.ucsExcluidas} UC(s) sem contrato vigente assinado não incluída(s).`:""}</Text>
    {resultado?.suspensas?.length?<Text style={{color:Colors.subtitle}}>{resultado.suspensas.length} UC(s) sem nova alocação porque o saldo cobre a previsão de consumo. Elas aparecem no rascunho para conferência e não entram como beneficiárias com cota zero no CSV Cemig. Seus contratos permanecem ativos.</Text>:null}
    {resultado?.saldosSemHistorico?<Text style={{color:Colors.subtitle}}>{resultado.saldosSemHistorico} UC(s) sem saldo registrado: considerado zero. Confira o saldo e sua competência no rascunho antes de solicitar o rateio.</Text>:null}
    {resultado?.pendencias?.length?<Text style={{color:Colors.subtitle}}>Para o CSV Cemig: {resultado.pendencias.join(" ")}</Text>:null}
    </View>:null}
    {resultado && !resultado.rascunho?<Text style={{color:Colors.primary,fontWeight:"700"}}>CSV pronto · prossiga em Enviar à Cemig</Text>:null}
    <SecaoRateio titulo="Preparar arquivo" resumo="Leitura no app · cópia enviada ao gerador" aberto={arquivoAberto} onPress={()=>setArquivoAberto(v=>!v)}/>
    {arquivoAberto?<View style={{borderTopWidth:1,borderColor:Colors.border,paddingTop:12,gap:8}}>
      <Text style={{color:Colors.subtitle}}>O arquivo usa o padrão Cemig quando a âncora e os números das UCs estão conferidos; caso contrário, gera um rascunho. Ao gerar, uma cópia é enviada ao e-mail cadastrado do gerador.</Text>
      <Button title={ocupado?"Preparando…":resultado?"Abrir planilha":"Gerar e abrir planilha"} disabled={ocupado||!competencia} onPress={()=>resultado?setVisualizando(true):void gerar()} />
      {resultado?<Button title="Atualizar planilha" disabled={ocupado} onPress={()=>Alert.alert("Atualizar planilha","Recalcular esta competência e enviar a nova cópia ao gerador?",[{text:"Cancelar",style:"cancel"},{text:"Atualizar",onPress:()=>void gerar()}])}/>:null}
    </View>:null}
    <SecaoRateio titulo="Enviar à Cemig" resumo="Portal e teste de envio em nuvem" aberto={envioAberto} onPress={()=>setEnvioAberto(v=>!v)}/>
    <View style={{display:envioAberto?"flex":"none",gap:Spacing.sm}}>
      <Text style={{color:Colors.subtitle}}>Salve o CSV em Preparar arquivo e anexe em Compensação de Geração Distribuída. O arquivo gerado não comprova envio ou aprovação pela Cemig.</Text>
      <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL("https://atende.cemig.com.br/Login").catch(()=>Alert.alert("Não foi possível abrir","Acesse o Cemig Atende no navegador."))} style={{minHeight:44,justifyContent:"center"}}><Text style={{color:Colors.primary,fontWeight:"700"}}>Abrir Cemig Atende</Text></Pressable>
      <CemigCloudSimulation usinaId={usinaId} competencia={competencia} ucAncora={ancora} numerosConfirmados={numerosAtuaisConfirmados} vaultConfigured={vaultConfigured}/>
    </View>
  </View></Card></>;
}

function SecaoRateio({titulo,resumo,aberto,onPress}:{titulo:string;resumo:string;aberto:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{expanded:aberto}} onPress={onPress} style={{minHeight:64,borderTopWidth:1,borderTopColor:Colors.border,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:10}}><View style={{flex:1,gap:4}}><Text style={{fontWeight:"700",color:Colors.text}}>{titulo}</Text><Text style={{color:Colors.subtitle,lineHeight:20}}>{resumo}</Text></View><Ionicons name={aberto?"chevron-up":"chevron-down"} size={20} color={Colors.primary}/></Pressable>;}

function Opcao({label,checked,disabled,onPress}:{label:string;checked:boolean;disabled:boolean;onPress:()=>void}){return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked,disabled}} disabled={disabled} onPress={onPress} style={{minHeight:48,flexDirection:"row",alignItems:"center",gap:10,opacity:disabled?0.45:1}}><Ionicons name={checked?"checkbox":"square-outline"} size={24} color={checked?Colors.primary:Colors.subtitle}/><Text style={{flex:1,color:Colors.text,lineHeight:20}}>{label}</Text></Pressable>;}
