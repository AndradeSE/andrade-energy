import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "../assistant/AssistantNativeControls";
import * as Sharing from "expo-sharing";
import { Button, Card } from "../ui";
import FormField from "../cadastro/FormField";
import { gerarPlanilhaRateio,obterConfiguracaoRateio,salvarConfiguracaoRateio,buscarRateioAutomatico,type ConfiguracaoRateio } from "../../services/usinas.service";
import { Colors, Spacing } from "../../theme";
import {obterSaldoAncora,type SaldoAncora} from "../../services/usinas.service";
import CemigCloudSimulation from './CemigCloudSimulation';

export default function RateioMensalCard({usinaId,empresaId,competencia}: {usinaId:string;empresaId:string;competencia?:string}) {
  const [formatoCemig,setFormatoCemig]=useState(false);
  const [enviarEmail,setEnviarEmail]=useState(false);
  const [ajustes,setAjustes]=useState(false);
  const [detalhes,setDetalhes]=useState(false);
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
  useEffect(()=>{setResultado(undefined);setNumerosAtuaisConfirmados(false);},[competencia]);
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
  async function compartilhar(plano:Awaited<ReturnType<typeof gerarPlanilhaRateio>>){
    if(Platform.OS==="web"){
      const url=URL.createObjectURL(new Blob([plano.csv],{type:"text/csv;charset=utf-8"}));
      const link=document.createElement("a");link.href=url;link.download=plano.arquivo;link.click();URL.revokeObjectURL(url);
    }else{
      if(!FileSystem.cacheDirectory)throw new Error("Armazenamento temporário indisponível.");
      const uri=FileSystem.cacheDirectory+plano.arquivo;
      await FileSystem.writeAsStringAsync(uri,plano.csv,{encoding:FileSystem.EncodingType.UTF8});
      if(!await Sharing.isAvailableAsync())throw new Error("Compartilhamento indisponível neste dispositivo.");
      await Sharing.shareAsync(uri,{mimeType:"text/csv",dialogTitle:"Salvar planilha de rateio"});
    }
  }
  async function baixarAuto(){if(!competencia||ocupado)return;const pedido=escopo.current;setOcupado(true);try{const plano=await buscarRateioAutomatico(usinaId,competencia);if(pedido!==escopo.current)return;setResultado(plano);await compartilhar(plano);}catch(e:any){Alert.alert("Rateio automático",e?.response?.data?.message??e.message??"Tente novamente.");}finally{setOcupado(false);}}
  async function gerar(email:boolean,formatoCemig=false) {
    if(!competencia||ocupado)return;
    const pedido=escopo.current;
    setOcupado(true);
    try {
      const plano=await gerarPlanilhaRateio(usinaId,competencia,ancora,email,{numerosAtuaisConfirmados,formatoCemig});
      if(pedido!==escopo.current)return;
      setResultado(plano);
      await AsyncStorage.setItem(chave,ancora);
      if(email){Alert.alert(plano.emailEnviado?"Planilha enviada":"E-mail não enviado",plano.emailEnviado?"Confira no e-mail cadastrado do gerador. A planilha não foi enviada à Cemig.":"O provedor não confirmou o envio. Você pode baixar a planilha e tentar novamente.");return;}
      await compartilhar(plano);
    }catch(e:any){if(pedido===escopo.current)Alert.alert("Não foi possível gerar o rateio",e?.response?.data?.message??e.message??"Tente novamente.");}
    finally{setOcupado(false);}
  }
  return <Card><View style={{gap:Spacing.sm}}>
    <Text style={{fontSize:18,fontWeight:"700",color:Colors.text}}>Planilha mensal de rateio</Text>
    <CemigCloudSimulation usinaId={usinaId} competencia={competencia} ucAncora={ancora} numerosConfirmados={numerosAtuaisConfirmados}/>
    <View style={{backgroundColor:"#EFF7F2",borderRadius:12,padding:16,gap:6}} accessibilityLabel="Saldo acumulado da UC âncora">
      <Text style={{fontWeight:"700",color:Colors.text}}>Saldo acumulado da UC âncora</Text>
      <Text style={{fontSize:24,fontWeight:"700",color:Colors.primary,flexShrink:1}}>{consultandoSaldo?"Consultando…":erroSaldo?"Consulta indisponível":saldoAncora?.saldoKwh!=null?`${saldoAncora.saldoKwh.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh`:"Saldo não informado"}</Text>
      {saldoAncora?<Text style={{color:Colors.subtitle}}>UC {saldoAncora.uc}{!ancora?" · geradora (âncora sugerida)":""}{saldoAncora.referencia?` · referência ${saldoAncora.referencia.slice(5,7)}/${saldoAncora.referencia.slice(0,4)}`:""}</Text>:null}
      <Text style={{color:Colors.subtitle}}>Saldo total informado pela Cemig para esta UC, incluindo créditos recebidos de outras usinas, como GD1. A injeção recebida não é somada novamente, e o rateio previsto ainda não compõe este saldo.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar saldo da UC âncora" disabled={consultandoSaldo} onPress={()=>setRevisaoSaldo(v=>v+1)} style={{minHeight:44,justifyContent:"center"}}><Text style={{color:Colors.primary,fontWeight:"700"}}>Atualizar saldo</Text></Pressable>
      {!consultandoSaldo&&!erroSaldo&&saldoAncora?.saldoKwh==null?<Text style={{color:Colors.subtitle}}>Importe uma fatura que informe o saldo de créditos para atualizar este indicador.</Text>:null}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:detalhes}} onPress={()=>setDetalhes(v=>!v)} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:8}}><Ionicons name="information-circle-outline" size={20} color={Colors.primary}/><Text style={{color:Colors.primary}}>Como é calculado?</Text></Pressable>
    {detalhes?<Text style={{color:Colors.subtitle}}>(Consumo médio − saldo de créditos da UC) ÷ produção média real da usina × 100, sem adicional e com mínimo de zero. O restante fica na UC âncora. Recalcule a cada competência antes de solicitar a alteração à Cemig.</Text>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:ajustes}} onPress={()=>setAjustes(v=>!v)} style={{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={{fontWeight:"700",color:Colors.text}}>Âncora e configuração</Text><Ionicons name={ajustes?"chevron-up":"chevron-down"} size={20} color={Colors.primary}/></Pressable>
    {ajustes?<View style={{gap:Spacing.sm}}><FormField label="UC âncora (opcional)" value={ancora} onChangeText={v=>{setAncora(v.replace(/\D/g,"").slice(0,20));setNumerosAtuaisConfirmados(false);setResultado(undefined);}} keyboardType="number-pad" />
    <Text style={{color:Colors.subtitle}}>O documento da âncora segue a titularidade: gerador ou cliente, conforme o cadastro. Não é necessário digitar CPF/CNPJ aqui.</Text>
    <Text style={{color:Colors.subtitle}}>Sem número, o arquivo será um rascunho com “UC âncora — a definir”. Este campo não cadastra cliente nem gera cobrança. Salve a configuração abaixo para usar a âncora automaticamente em todos os aparelhos.</Text>
    <Text style={{color:Colors.subtitle}}>O CSV Cemig terá somente UC; CPF/CNPJ; Cota; Âncora, sem cabeçalho. Deve usar o número atual da UC, não o antigo número de instalação. O documento de cada beneficiária vem do titular da UC.</Text>
    <Opcao label="Conferi os números atuais das UCs" checked={numerosAtuaisConfirmados} disabled={ocupado} onPress={()=>setNumerosAtuaisConfirmados(v=>!v)} />
    <Button title="Salvar configuração do rateio automático" disabled={ocupado} onPress={()=>void salvarAuto()} />
    </View>:null}
    <Text style={{color:Colors.subtitle}}>{erroConfig?"Não foi possível consultar a automação. Tente salvar a configuração novamente.":config?.habilitado?"Geração automática ativa: aguarda a produção da usina e todas as faturas das UCs ativas com contrato vigente. Ao gerar, avisa o gerador no app/push e envia a planilha por e-mail. Sem âncora ou dados conferidos, gera um rascunho.":"Consultando configuração automática…"}</Text>
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="GERADO"?<Button title="Baixar rateio gerado automaticamente" disabled={ocupado} onPress={()=>void baixarAuto()} />:null}
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="ERRO"?<Text style={{color:Colors.subtitle}}>Não foi possível concluir a geração automática. {config.registros.find(r=>r.competencia.slice(0,7)===competencia)?.erro}</Text>:null}
    {resultado?<Text style={{color:Colors.subtitle}}>Base: {resultado.producaoMedia.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh/mês ({resultado.mesesNaMedia} meses registrados). {resultado.ucsExcluidas?`${resultado.ucsExcluidas} UC(s) sem contrato vigente assinado não incluída(s).`:""}</Text>:null}
    {resultado?.suspensas?.length?<Text style={{color:Colors.subtitle}}>{resultado.suspensas.length} UC(s) sem nova alocação porque o saldo cobre a previsão de consumo. Elas aparecem no rascunho para conferência e não entram como beneficiárias com cota zero no CSV Cemig. Seus contratos permanecem ativos.</Text>:null}
    {resultado?.saldosSemHistorico?<Text style={{color:Colors.subtitle}}>{resultado.saldosSemHistorico} UC(s) sem saldo registrado: considerado zero. Confira o saldo e sua competência no rascunho antes de solicitar o rateio.</Text>:null}
    {resultado?.pendencias?.length?<Text style={{color:Colors.subtitle}}>Para o CSV Cemig: {resultado.pendencias.join(" ")}</Text>:null}
    {resultado && !resultado.rascunho?<View style={{padding:12,borderRadius:12,backgroundColor:"#EFF7F2",gap:8}}>
      <Text style={{fontWeight:"700",color:Colors.text}}>Solicitação à Cemig</Text>
      <Text style={{color:Colors.subtitle}}>CSV preparado. Abra Compensação de Geração Distribuída, selecione a geradora e a modalidade, escolha Inserir por anexo e anexe o CSV. Login, CAPTCHA e confirmação são feitos no portal. A abertura do portal não confirma envio nem aplicação do rateio.</Text>
      <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL("https://www.atendimento.cemig.com.br/portal/services/compensation-gd").catch(()=>Alert.alert("Não foi possível abrir","Acesse o Cemig Atende no navegador."))} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:8}}><Ionicons name="open-outline" size={20} color={Colors.primary}/><Text style={{color:Colors.primary,fontWeight:"700"}}>Continuar no Cemig Atende</Text></Pressable>
    </View>:null}
    <View style={{borderTopWidth:1,borderColor:Colors.border,paddingTop:12,gap:8}}>
      <Text style={{fontWeight:"700",color:Colors.text}}>Preparar planilha</Text>
      <Opcao label="CSV no padrão Cemig" checked={formatoCemig} disabled={ocupado} onPress={()=>setFormatoCemig(v=>!v)} />
      <Text style={{color:Colors.subtitle}}>{formatoCemig?"Exige âncora e números atuais conferidos.":"Rascunho para conferir dados, sem enviar à Cemig."}</Text>
      <Opcao label="Enviar ao e-mail cadastrado do gerador" checked={enviarEmail} disabled={ocupado} onPress={()=>setEnviarEmail(v=>!v)} />
      <Button title={ocupado?"Preparando…":enviarEmail?"Gerar e enviar":"Gerar e baixar"} disabled={ocupado||!competencia} onPress={()=>enviarEmail?Alert.alert("Enviar planilha","Enviar a competência "+competencia+" ao gerador cadastrado? Não será enviada à Cemig.",[{text:"Cancelar",style:"cancel"},{text:"Enviar",onPress:()=>void gerar(true,formatoCemig)}]):void gerar(false,formatoCemig)} />
    </View>
  </View></Card>;
}

function Opcao({label,checked,disabled,onPress}:{label:string;checked:boolean;disabled:boolean;onPress:()=>void}){return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked,disabled}} disabled={disabled} onPress={onPress} style={{minHeight:48,flexDirection:"row",alignItems:"center",gap:10,opacity:disabled?0.45:1}}><Ionicons name={checked?"checkbox":"square-outline"} size={24} color={checked?Colors.primary:Colors.subtitle}/><Text style={{flex:1,color:Colors.text,lineHeight:20}}>{label}</Text></Pressable>;}
