import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Button, Card } from "../ui";
import FormField from "../cadastro/FormField";
import { gerarPlanilhaRateio } from "../../services/usinas.service";
import { Colors, Spacing } from "../../theme";

export default function RateioMensalCard({usinaId,empresaId,competencia}: {usinaId:string;empresaId:string;competencia?:string}) {
  const [ancora,setAncora]=useState("");
  const [documentoAncora,setDocumentoAncora]=useState("");
  const [numerosAtuaisConfirmados,setNumerosAtuaisConfirmados]=useState(false);
  const [ocupado,setOcupado]=useState(false);
  const [resultado,setResultado]=useState<Awaited<ReturnType<typeof gerarPlanilhaRateio>>>();
  const chave=`rateio:ancora:${empresaId}:${usinaId}`;
  const escopo=useRef("");
  escopo.current=`${chave}:${competencia}`;
  useEffect(()=>{let ativo=true;setAncora("");setDocumentoAncora("");setNumerosAtuaisConfirmados(false);setResultado(undefined);void AsyncStorage.getItem(chave).then(v=>{if(ativo)setAncora(v??"");});return()=>{ativo=false;};},[chave]);
  useEffect(()=>{setResultado(undefined);setNumerosAtuaisConfirmados(false);},[competencia]);
  async function gerar(email:boolean,formatoCemig=false) {
    if(!competencia||ocupado)return;
    const pedido=escopo.current;
    setOcupado(true);
    try {
      const plano=await gerarPlanilhaRateio(usinaId,competencia,ancora,email,{documentoAncora,numerosAtuaisConfirmados,formatoCemig});
      if(pedido!==escopo.current)return;
      setResultado(plano);
      await AsyncStorage.setItem(chave,ancora);
      if(email){Alert.alert(plano.emailEnviado?"Planilha enviada":"E-mail não enviado",plano.emailEnviado?"Confira no e-mail cadastrado do gerador. A planilha não foi enviada à Cemig.":"O provedor não confirmou o envio. Você pode baixar a planilha e tentar novamente.");return;}
      if(Platform.OS==="web"){
        const url=URL.createObjectURL(new Blob([plano.csv],{type:"text/csv;charset=utf-8"}));
        const link=document.createElement("a");link.href=url;link.download=plano.arquivo;link.click();URL.revokeObjectURL(url);
      } else {
        if(!FileSystem.cacheDirectory)throw new Error("Armazenamento temporário indisponível.");
        const uri=FileSystem.cacheDirectory+plano.arquivo;
        await FileSystem.writeAsStringAsync(uri,plano.csv,{encoding:FileSystem.EncodingType.UTF8});
        if(!await Sharing.isAvailableAsync())throw new Error("Compartilhamento indisponível neste dispositivo.");
        await Sharing.shareAsync(uri,{mimeType:"text/csv",dialogTitle:"Salvar planilha de rateio"});
      }
    }catch(e:any){if(pedido===escopo.current)Alert.alert("Não foi possível gerar o rateio",e?.response?.data?.message??e.message??"Tente novamente.");}
    finally{setOcupado(false);}
  }
  return <Card><View style={{gap:Spacing.sm}}>
    <Text style={{fontSize:18,fontWeight:"700",color:Colors.text}}>Planilha mensal de rateio</Text>
    <Text style={{color:Colors.subtitle}}>Consumo médio ÷ produção média real da usina × 100, sem adicional. O restante fica na UC âncora. Recalcule a cada competência antes de solicitar a alteração à Cemig.</Text>
    <FormField label="UC âncora (opcional)" value={ancora} onChangeText={v=>{setAncora(v.replace(/\D/g,"").slice(0,20));setResultado(undefined);}} keyboardType="number-pad" />
    <FormField label="CPF/CNPJ do titular da UC âncora" value={documentoAncora} onChangeText={v=>{setDocumentoAncora(v.replace(/\D/g,"").slice(0,14));setResultado(undefined);}} keyboardType="number-pad" />
    <Text style={{color:Colors.subtitle}}>Sem número, o arquivo será um rascunho com “UC âncora — a definir”. Este campo não cadastra cliente nem gera cobrança. A escolha fica salva neste aparelho e pode ser trocada.</Text>
    <Text style={{color:Colors.subtitle}}>O CSV Cemig terá somente UC; CPF/CNPJ; Cota; Âncora, sem cabeçalho. Deve usar o número atual da UC, não o antigo número de instalação. O documento de cada beneficiária vem do titular da UC.</Text>
    <Button title={numerosAtuaisConfirmados?"Números atuais de UC conferidos ✓":"Confirmar que conferi os números atuais de UC"} disabled={ocupado} onPress={()=>setNumerosAtuaisConfirmados(v=>!v)} />
    {resultado?<Text style={{color:Colors.subtitle}}>Base: {resultado.producaoMedia.toLocaleString("pt-BR",{maximumFractionDigits:2})} kWh/mês ({resultado.mesesNaMedia} meses registrados). {resultado.ucsExcluidas?`${resultado.ucsExcluidas} UC(s) sem contrato vigente assinado não incluída(s).`:""}</Text>:null}
    {resultado?.pendencias?.length?<Text style={{color:Colors.subtitle}}>Para o CSV Cemig: {resultado.pendencias.join(" ")}</Text>:null}
    <Button title={ocupado?"Preparando…":"Baixar CSV no padrão Cemig"} disabled={ocupado||!competencia} onPress={()=>void gerar(false,true)} />
    <Button title="Baixar rascunho de conferência" disabled={ocupado||!competencia} onPress={()=>void gerar(false,false)} />
    <Button title="Enviar ao e-mail do gerador" disabled={ocupado||!competencia} onPress={()=>Alert.alert("Enviar planilha",`Enviar a competência ${competencia} ao e-mail cadastrado do gerador? O CSV Cemig exige todos os dados. O rascunho serve somente para conferência.`,[{text:"Cancelar",style:"cancel"},{text:"Enviar rascunho",onPress:()=>void gerar(true,false)},{text:"Enviar CSV Cemig",onPress:()=>void gerar(true,true)}])} />
  </View></Card>;
}
