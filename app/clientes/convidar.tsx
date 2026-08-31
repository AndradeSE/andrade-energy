import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, ElasticScrollView as ScrollView } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { criarConvite } from "../../services/convites.service";
import { notificarAvisoNoAndroid } from "../../services/carteira-notificacoes.service";
import { useAuth } from "../../contexts/AuthContext";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function ConvidarCliente() {
  const { usuario } = useAuth();
  const [nome, setNome] = useState(""); const [cpf, setCpf] = useState(""); const [email, setEmail] = useState(""); const [whatsapp, setWhatsapp] = useState(""); const [endereco, setEndereco] = useState(""); const [enviando, setEnviando] = useState(false);
  async function enviar() {
    if (!nome.trim() || cpf.length !== 11 || !email.includes("@") || whatsapp.length < 10 || !endereco.trim()) return Alert.alert("Dados incompletos", "Informe nome, CPF, e-mail, WhatsApp com DDD e endereço.");
    try {
      setEnviando(true);
      const resultado = await criarConvite({ nome: nome.trim(), cpf, email: email.trim().toLowerCase(), whatsapp, endereco: endereco.trim() });
      void notificarAvisoNoAndroid({
        usuarioId: String(usuario?.id ?? ""),
        id: `convite:${resultado.token}`,
        titulo: "Convite criado",
        detalhe: `O convite para ${nome.trim()} está pronto para envio.`,
        rota: "/clientes",
      });
      const canais = [resultado.emailEnviado ? "e-mail" : null, resultado.whatsappEnviado ? "WhatsApp" : null].filter(Boolean).join(" e ");
      const mensagem = canais
        ? `Convite enviado por ${canais}.${resultado.emailEnviado && !resultado.whatsappEnviado ? " Confirme agora o envio pelo WhatsApp." : ""}`
        : `O convite foi criado, mas os envios automáticos não foram concluídos. Compartilhe esta chave:\n\n${resultado.token}`;
      const abrirWhatsapp = async () => {
        const texto = `Olá, ${nome.trim()}! Você recebeu um convite para criar sua conta no Andrade Energy Consumidor. Chave do convite: ${resultado.token}`;
        await Linking.openURL(`https://wa.me/55${whatsapp}?text=${encodeURIComponent(texto)}`);
        router.back();
      };
      const acoes: any[] = [];
      if (!resultado.whatsappEnviado) acoes.push({ text: "Enviar no WhatsApp", onPress: abrirWhatsapp });
      if (!resultado.emailEnviado) acoes.push({ text: "Copiar chave", onPress: async () => { await Clipboard.setStringAsync(String(resultado.token ?? "")); } });
      acoes.push({ text: "OK", onPress: () => router.back() });
      Alert.alert(canais ? "Convite enviado" : "Convite criado", mensagem, acoes);
    } catch (error: any) { Alert.alert("Não foi possível convidar", error?.response?.data?.message ?? "Tente novamente."); }
    finally { setEnviando(false); }
  }
  return <SafeAreaView style={styles.screen}>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Convidar consumidor" subtitle="Enviar acesso ao aplicativo" contextTitle="Convidar consumidor" contextSubtitle="Envie o acesso ao aplicativo do cliente" icon="mail-unread-outline" /> : null}<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <View style={styles.icon}><Ionicons name="mail-unread-outline" size={32} color={Colors.primary} /></View><Text style={styles.title}>Convidar consumidor</Text><Text style={styles.subtitle}>Depois que aceitar o convite e criar a conta, o consumidor aparecerá automaticamente na lista de clientes. As unidades e condições do contrato poderão ser adicionadas dentro do cadastro dele.</Text>
    <Campo label="Nome completo" value={nome} onChangeText={setNome} placeholder="Nome do consumidor" />
    <Campo label="CPF" value={cpf} onChangeText={(v: string) => setCpf(v.replace(/\D/g, "").slice(0, 11))} placeholder="Somente números" keyboardType="numeric" />
    <Campo label="E-mail" value={email} onChangeText={setEmail} placeholder="consumidor@email.com" keyboardType="email-address" />
    <Campo label="WhatsApp" value={whatsapp} onChangeText={(v: string) => setWhatsapp(v.replace(/\D/g, "").slice(0, 11))} placeholder="DDD + número" keyboardType="phone-pad" />
    <Campo label="Endereço" value={endereco} onChangeText={setEndereco} placeholder="Rua, número, bairro, cidade/UF" />
    <TouchableOpacity disabled={enviando} onPress={enviar} style={[styles.button, enviando && { opacity: .7 }]}>{enviando ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send-outline" size={20} color="#FFF" /><Text style={styles.buttonText}>Enviar convite</Text></>}</TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function Campo(props: any) { return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} autoCapitalize={props.keyboardType === "email-address" ? "none" : "words"} placeholderTextColor="#92979F" style={styles.input} /></View>; }
const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:"#F5F6F5"},flex:{flex:1},content:{flexGrow:1,justifyContent:"center",padding:Spacing.lg},back:{position:"absolute",top:Spacing.lg,left:Spacing.lg,width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#DEE0E3"},icon:{width:68,height:68,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#DEE0E3"},title:{marginTop:Spacing.lg,color:Colors.text,fontSize:28,fontWeight:"900"},subtitle:{marginTop:Spacing.sm,marginBottom:Spacing.lg,color:Colors.subtitle,lineHeight:22},label:{marginTop:Spacing.sm,marginBottom:6,color:Colors.text,fontSize:Typography.small,fontWeight:"800"},input:{height:54,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,backgroundColor:Colors.surface,color:Colors.text},button:{minHeight:56,flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",marginTop:Spacing.xl,borderRadius:Radius.md,backgroundColor:Colors.primary},buttonText:{color:"#FFF",fontWeight:"900",fontSize:Typography.body} });
