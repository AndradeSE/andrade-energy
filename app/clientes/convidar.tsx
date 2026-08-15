import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { criarConvite } from "../../services/convites.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function ConvidarCliente() {
  const [nome, setNome] = useState(""); const [cpf, setCpf] = useState(""); const [email, setEmail] = useState(""); const [enviando, setEnviando] = useState(false);
  async function enviar() {
    if (!nome.trim() || cpf.length !== 11 || !email.includes("@")) return Alert.alert("Dados incompletos", "Informe nome, CPF e e-mail válidos.");
    try {
      setEnviando(true);
      const resultado = await criarConvite({ nome: nome.trim(), cpf, email: email.trim().toLowerCase() });
      Alert.alert(resultado.emailEnviado ? "Convite enviado" : "Convite criado", resultado.emailEnviado ? "O consumidor receberá o convite por e-mail." : `O e-mail não pôde ser enviado. Código: ${resultado.token}`, [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("Não foi possível convidar", error?.response?.data?.message ?? "Tente novamente."); }
    finally { setEnviando(false); }
  }
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={Colors.text} /></TouchableOpacity>
    <View style={styles.icon}><Ionicons name="mail-unread-outline" size={32} color={Colors.primary} /></View><Text style={styles.title}>Convidar consumidor</Text><Text style={styles.subtitle}>O CPF conectará automaticamente a conta do consumidor ao cliente e às unidades cadastradas.</Text>
    <Campo label="Nome completo" value={nome} onChangeText={setNome} placeholder="Nome do consumidor" />
    <Campo label="CPF" value={cpf} onChangeText={(v: string) => setCpf(v.replace(/\D/g, "").slice(0, 11))} placeholder="Somente números" keyboardType="numeric" />
    <Campo label="E-mail" value={email} onChangeText={setEmail} placeholder="consumidor@email.com" keyboardType="email-address" />
    <TouchableOpacity disabled={enviando} onPress={enviar} style={[styles.button, enviando && { opacity: .7 }]}>{enviando ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send-outline" size={20} color="#FFF" /><Text style={styles.buttonText}>Enviar convite</Text></>}</TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function Campo(props: any) { return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} autoCapitalize={props.keyboardType === "email-address" ? "none" : "words"} placeholderTextColor="#92979F" style={styles.input} /></View>; }
const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:"#F5F6F5"},flex:{flex:1},content:{flexGrow:1,justifyContent:"center",padding:Spacing.lg},back:{position:"absolute",top:Spacing.lg,left:Spacing.lg,width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#DEE0E3"},icon:{width:68,height:68,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#DEE0E3"},title:{marginTop:Spacing.lg,color:Colors.text,fontSize:28,fontWeight:"900"},subtitle:{marginTop:Spacing.sm,marginBottom:Spacing.lg,color:Colors.subtitle,lineHeight:22},label:{marginTop:Spacing.sm,marginBottom:6,color:Colors.text,fontSize:Typography.small,fontWeight:"800"},input:{height:54,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,backgroundColor:Colors.surface,color:Colors.text},button:{minHeight:56,flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",marginTop:Spacing.xl,borderRadius:Radius.md,backgroundColor:Colors.primary},buttonText:{color:"#FFF",fontWeight:"900",fontSize:Typography.body} });
