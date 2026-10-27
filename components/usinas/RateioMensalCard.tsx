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
import RateioFileViewer from './RateioFileViewer';

export default function RateioMensalCard({usinaId,empresaId,competencia}: {usinaId:string;empresaId:string;competencia?:string}) {
  const [visualizando,setVisualizando]=useState(false);
  const [ajustes,setAjustes]=useState(false);
  const [detalhes,setDetalhes]=useState(false);
  const [revisaoAberta,setRevisaoAberta]=useState(false);
  const [arquivoAberto,setArquivoAberto]=useState(false);
  const [envioAberto,setEnvioAberto]=useState(false);
  const [ancora,setAncora]=useState("");
  // A conferência é estrutural no servidor; não registramos aceite humano fictício.
  const numerosAtuaisConfirmados=false;
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
  useEffect(()=>{let ativo=true;setAncora("");setResultado(undefined);setConfig(undefined);setErroConfig(false);void obterConfiguracaoRateio(usinaId).then(async c=>{const local=await AsyncStorage.getItem(chave);if(ativo){setConfig(c);setAncora(c.uc_ancora??local??"");}}).catch(()=>{if(ativo)setErroConfig(true);});return()=>{ativo=false;};},[chave,usinaId]);
  useEffect(()=>{setResultado(undefined);setVisualizando(false);},[competencia]);
  useEffect(()=>{
    let ativo=true;setSaldoAncora(undefined);setErroSaldo(false);
    if(!competencia||!config)return;
    setConsultandoSaldo(true);
    const timer=setTimeout(()=>void obterSaldoAncora(usinaId,ancora,competencia).then(s=>{if(ativo)setSaldoAncora(s);}).catch(()=>{if(ativo)setErroSaldo(true);}).finally(()=>{if(ativo)setConsultandoSaldo(false);}),350);
    return()=>{ativo=false;clearTimeout(timer);};
  },[usinaId,empresaId,ancora,competencia,config,revisaoSaldo]);
  async function escolherAncora(valor:string){
    if(ocupado)return;const pedido=escopo.current;setOcupado(true);
    try{const c=await salvarConfiguracaoRateio(usinaId,valor,false);if(pedido!==escopo.current)return;setAncora(c.uc_ancora);setConfig(c);setResultado(undefined);await AsyncStorage.setItem(chave,c.uc_ancora);}
    catch(e:any){Alert.alert('Âncora não alterada',e?.response?.data?.message??'Não foi possível salvar a escolha. Tente novamente.');}
    finally{setOcupado(false);}
  }
  async function salvarAuto(){
    const pedido=escopo.current;setOcupado(true);
    try{const c=await salvarConfiguracaoRateio(usinaId,ancora,numerosAtuaisConfirmados);if(pedido===escopo.current){setConfig(c);setErroConfig(false);Alert.alert("Configuração da planilha salva","A âncora padrão fica salva para esta usina. A planilha será gerada após a produção e todas as faturas das UCs vigentes. Isso não ativa envio automático à Cemig.");}}
    catch(e:any){Alert.alert("Não foi possível salvar",e?.response?.data?.message??"Tente novamente.");}finally{setOcupado(false);}
  }
  async function baixarAuto(){if(!competencia||ocupado)return;const pedido=escopo.current;setOcupado(true);try{const plano=await buscarRateioAutomatico(usinaId,competencia);if(pedido!==escopo.current)return;setResultado(plano);setVisualizando(true);}catch(e:any){Alert.alert("Rateio automático",e?.response?.data?.message??e.message??"Tente novamente.");}finally{setOcupado(false);}}
  async function gerar() {
    if(!competencia||ocupado)return;
    const pedido=escopo.current;
    setOcupado(true);
    try {
      const plano=await gerarPlanilhaRateio(usinaId,competencia,ancora,true,{numerosAtuaisConfirmados,formatoCemig:!!ancora});
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
    <View style={{backgroundColor:'#EFF7F2',padding:16,borderRadius:12,gap:10}}><Text style={{fontWeight:'700',color:Colors.text}}>O que acontece automaticamente?</Text><Text style={{color:Colors.text,lineHeight:22}}>Com a configuração salva, o sistema aguarda a produção da usina e todas as faturas das UCs vigentes. Depois calcula a planilha e envia o arquivo por e-mail e um aviso ao gerador.</Text><Text style={{color:Colors.subtitle,lineHeight:22}}>O envio à Cemig é uma etapa separada. A automação completa em nuvem ainda está em teste e não protocola o rateio.</Text></View>
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
    <Pressable accessibilityRole="button" accessibilityState={{expanded:ajustes}} onPress={()=>setAjustes(v=>!v)} style={{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={{fontWeight:"700",color:Colors.text}}>Configuração da planilha</Text><Ionicons name={ajustes?"chevron-up":"chevron-down"} size={20} color={Colors.primary}/></Pressable>
    <View style={{display:ajustes?"flex":"none",gap:Spacing.sm}}><UcAncoraSelector usinaId={usinaId} empresaId={empresaId} value={ancora} disabled={ocupado} onChange={v=>void escolherAncora(v)} />
    <Text style={{color:Colors.subtitle}}>Use o número atual da UC. Sem âncora, gera rascunho. Titulares, documentos e e-mail vêm dos cadastros existentes.</Text>
    <Text style={{color:Colors.subtitle}}>O app verifica formato, duplicidade, titulares e percentuais. A aceitação dos números cadastrados depende da validação da Cemig.</Text>
    <Text style={{color:Colors.subtitle,lineHeight:22}}>Esta configuração controla somente a geração da planilha e a âncora padrão. Não autoriza nem ativa envio à Cemig.</Text>
    <Button title="Salvar configuração da planilha" disabled={ocupado} onPress={()=>void salvarAuto()} />
    </View>
    <Text style={{color:Colors.subtitle}}>{erroConfig?"Não foi possível consultar a automação. Tente salvar a configuração novamente.":config?.habilitado?"Automático: aguarda produção + faturas de todas as UCs vigentes. Ao gerar, envia e-mail e aviso ao gerador.":config?"Geração automática não habilitada. Confira e salve as configurações do rateio.":"Consultando configuração automática…"}</Text>
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
    <SecaoRateio titulo="1. Planilha do mês" resumo="Geração automática · conferência e arquivo" aberto={arquivoAberto} onPress={()=>setArquivoAberto(v=>!v)}/>
    {arquivoAberto?<View style={{borderTopWidth:1,borderColor:Colors.border,paddingTop:12,gap:8}}>
      <Text style={{color:Colors.subtitle}}>O arquivo usa o padrão Cemig quando a âncora e os números das UCs estão conferidos; caso contrário, gera um rascunho. Ao gerar, uma cópia é enviada ao e-mail cadastrado do gerador.</Text>
      <Button title={ocupado?"Preparando…":resultado?"Abrir planilha":"Gerar e abrir planilha"} disabled={ocupado||!competencia} onPress={()=>resultado?setVisualizando(true):void gerar()} />
      {resultado?<Button title="Atualizar planilha" disabled={ocupado} onPress={()=>Alert.alert("Atualizar planilha","Recalcular esta competência e enviar a nova cópia ao gerador?",[{text:"Cancelar",style:"cancel"},{text:"Atualizar",onPress:()=>void gerar()}])}/>:null}
    </View>:null}
    <SecaoRateio titulo="2. Envio à Cemig" resumo="Escolha entre envio manual e automático" aberto={envioAberto} onPress={()=>setEnvioAberto(v=>!v)}/>
    <View style={{display:envioAberto?"flex":"none",gap:Spacing.sm}}>
      <Text style={{color:Colors.text,fontWeight:"700",fontSize:17}}>Envio manual</Text>
      <Text style={{color:Colors.subtitle}}>No celular, abra a Cemig, entre na sua conta e anexe o CSV em Compensação de Geração Distribuída. Este botão somente abre o portal: não envia o arquivo sozinho. A geração da planilha não comprova protocolo nem aprovação.</Text>
      <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL("https://atende.cemig.com.br/Login").catch(()=>Alert.alert("Não foi possível abrir","Acesse o Cemig Atende no navegador."))} style={{minHeight:44,justifyContent:"center"}}><Text style={{color:Colors.primary,fontWeight:"700"}}>Abrir Cemig Atende</Text></Pressable>
      <View style={{borderTopWidth:1,borderColor:Colors.border,paddingTop:16,marginTop:12,gap:10}}><Text style={{color:Colors.text,fontWeight:'700',fontSize:17}}>Autorizar e enviar</Text><Text style={{color:Colors.subtitle,lineHeight:22}}>Você revisa o arquivo e autoriza o robô a enviar. A ligação com o protocolo definitivo ainda está em validação; a simulação para antes de solicitar o cadastro.</Text><Button title="Envio autorizado · em validação" disabled onPress={()=>{}}/></View>
      <View style={{borderTopWidth:1,borderColor:Colors.border,paddingTop:16,marginTop:12,gap:10}}><Text style={{color:Colors.text,fontWeight:'700',fontSize:17}}>Envio automático</Text><Text style={{color:Colors.subtitle,lineHeight:22}}>Em testes. O robô em nuvem ainda não está disponível para envio definitivo. A geração automática da planilha não envia nem protocola o rateio na Cemig.</Text><Button title="Automático · em testes" disabled onPress={()=>{}}/></View>
    </View>
  </View></Card></>;
}

function SecaoRateio({titulo,resumo,aberto,onPress}:{titulo:string;resumo:string;aberto:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{expanded:aberto}} onPress={onPress} style={{minHeight:64,borderTopWidth:1,borderTopColor:Colors.border,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:10}}><View style={{flex:1,gap:4}}><Text style={{fontWeight:"700",color:Colors.text}}>{titulo}</Text><Text style={{color:Colors.subtitle,lineHeight:20}}>{resumo}</Text></View><Ionicons name={aberto?"chevron-up":"chevron-down"} size={20} color={Colors.primary}/></Pressable>;}
