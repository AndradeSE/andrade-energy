import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Button, Card } from "../ui";
import FormField from "../cadastro/FormField";
import { gerarPlanilhaRateio,obterConfiguracaoRateio,salvarConfiguracaoRateio,buscarRateioAutomatico,type ConfiguracaoRateio } from "../../services/usinas.service";
import { Colors, Spacing } from "../../theme";

export default function RateioMensalCard({usinaId,empresaId,competencia}: {usinaId:string;empresaId:string;competencia?:string}) {
  const [ancora,setAncora]=useState("");
  const [numerosAtuaisConfirmados,setNumerosAtuaisConfirmados]=useState(false);
  const [ocupado,setOcupado]=useState(false);
  const [resultado,setResultado]=useState<Awaited<ReturnType<typeof gerarPlanilhaRateio>>>();
  const [config,setConfig]=useState<ConfiguracaoRateio>();
  const [erroConfig,setErroConfig]=useState(false);
  const chave=`rateio:ancora:${empresaId}:${usinaId}`;
  const escopo=useRef("");
  escopo.current=`${chave}:${competencia}`;
  useEffect(()=>{let ativo=true;setAncora("");setNumerosAtuaisConfirmados(false);setResultado(undefined);setConfig(undefined);setErroConfig(false);void obterConfiguracaoRateio(usinaId).then(async c=>{const local=await AsyncStorage.getItem(chave);if(ativo){setConfig(c);setAncora(c.uc_ancora||local||"");setNumerosAtuaisConfirmados(c.numeros_confirmados);}}).catch(()=>{if(ativo)setErroConfig(true);});return()=>{ativo=false;};},[chave,usinaId]);
  useEffect(()=>{setResultado(undefined);setNumerosAtuaisConfirmados(false);},[competencia]);
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
    <Text style={{color:Colors.subtitle}}>(Consumo médio − saldo de créditos da UC) ÷ produção média real da usina × 100, sem adicional e com mínimo de zero. O restante fica na UC âncora. Recalcule a cada competência antes de solicitar a alteração à Cemig.</Text>
    <FormField label="UC âncora (opcional)" value={ancora} onChangeText={v=>{setAncora(v.replace(/\D/g,"").slice(0,20));setNumerosAtuaisConfirmados(false);setResultado(undefined);}} keyboardType="number-pad" />
    <Text style={{color:Colors.subtitle}}>O documento da âncora segue a titularidade: gerador ou cliente, conforme o cadastro. Não é necessário digitar CPF/CNPJ aqui.</Text>
    <Text style={{color:Colors.subtitle}}>Sem número, o arquivo será um rascunho com “UC âncora — a definir”. Este campo não cadastra cliente nem gera cobrança. Salve a configuração abaixo para usar a âncora automaticamente em todos os aparelhos.</Text>
    <Text style={{color:Colors.subtitle}}>O CSV Cemig terá somente UC; CPF/CNPJ; Cota; Âncora, sem cabeçalho. Deve usar o número atual da UC, não o antigo número de instalação. O documento de cada beneficiária vem do titular da UC.</Text>
    <Button title={numerosAtuaisConfirmados?"Números atuais de UC conferidos ✓":"Confirmar que conferi os números atuais de UC"} disabled={ocupado} onPress={()=>setNumerosAtuaisConfirmados(v=>!v)} />
    <Button title="Salvar configuração do rateio automático" disabled={ocupado} onPress={()=>void salvarAuto()} />
    <Text style={{color:Colors.subtitle}}>{erroConfig?"Não foi possível consultar a automação. Tente salvar a configuração novamente.":config?.habilitado?"Geração automática ativa: aguarda a produção da usina e todas as faturas das UCs ativas com contrato vigente. Ao gerar, avisa o gerador no app/push e envia a planilha por e-mail. Sem âncora ou dados conferidos, gera um rascunho.":"Consultando configuração automática…"}</Text>
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="GERADO"?<Button title="Baixar rateio gerado automaticamente" disabled={ocupado} onPress={()=>void baixarAuto()} />:null}
    {config?.registros?.find(r=>r.competencia.slice(0,7)===competencia)?.status==="ERRO"?<Text style={{color:Colors.subtitle}}>Não foi possível concluir a geração automática. {config.registros.find(r=>r.competencia.slice(0,7)===competencia)?.erro}</Text>:null}
    {resultado?<Text style={{color:Colors.subtitle}}>Base: {resultado.producaoMedia.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh/mês ({resultado.mesesNaMedia} meses registrados). {resultado.ucsExcluidas?`${resultado.ucsExcluidas} UC(s) sem contrato vigente assinado não incluída(s).`:""}</Text>:null}
    {resultado?.suspensas?.length?<Text style={{color:Colors.subtitle}}>{resultado.suspensas.length} UC(s) sem nova alocação porque o saldo cobre a previsão de consumo. Elas aparecem no rascunho para conferência e não entram como beneficiárias com cota zero no CSV Cemig. Seus contratos permanecem ativos.</Text>:null}
    {resultado?.saldosSemHistorico?<Text style={{color:Colors.subtitle}}>{resultado.saldosSemHistorico} UC(s) sem saldo registrado: considerado zero. Confira o saldo e sua competência no rascunho antes de solicitar o rateio.</Text>:null}
    {resultado?.pendencias?.length?<Text style={{color:Colors.subtitle}}>Para o CSV Cemig: {resultado.pendencias.join(" ")}</Text>:null}
    <Button title={ocupado?"Preparando…":"Baixar CSV no padrão Cemig"} disabled={ocupado||!competencia} onPress={()=>void gerar(false,true)} />
    <Button title="Baixar rascunho de conferência" disabled={ocupado||!competencia} onPress={()=>void gerar(false,false)} />
    <Button title="Enviar ao e-mail do gerador" disabled={ocupado||!competencia} onPress={()=>Alert.alert("Enviar planilha",`Enviar a competência ${competencia} ao e-mail cadastrado do gerador? O CSV Cemig exige todos os dados. O rascunho serve somente para conferência.`,[{text:"Cancelar",style:"cancel"},{text:"Enviar rascunho",onPress:()=>void gerar(true,false)},{text:"Enviar CSV Cemig",onPress:()=>void gerar(true,true)}])} />
  </View></Card>;
}
