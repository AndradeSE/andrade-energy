import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { obterPainelComercial, PainelComercial } from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const dataBr = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export default function DetalhesGerador() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [painel, setPainel] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void obterPainelComercial().then(setPainel).catch((error:any)=>Alert.alert("Gerador", error?.response?.data?.message ?? "Não foi possível carregar as informações.")).finally(()=>setLoading(false)); }, []);
  const gerador = painel?.geradores?.find((item:any)=>String(item.id)===String(id));
  const assinatura = painel?.assinaturas?.find((item:any)=>String(item.gerador_id)===String(id) && item.status!=="CANCELADA");
  if (loading) return <Screen><View style={styles.state}><ActivityIndicator color={Colors.primary}/></View></Screen>;
  if (!gerador) return <Screen><View style={styles.state}><Text style={styles.title}>Gerador não encontrado</Text><TouchableOpacity onPress={()=>router.back()}><Text style={styles.link}>Voltar</Text></TouchableOpacity></View></Screen>;
  const metrics = [
    ["business-outline", "Usinas cadastradas", String(gerador.total_usinas ?? 0)],
    ["flash-outline", "UCs ativas", String(gerador.total_ucs_ativas ?? 0)],
    ["card-outline", "Plano", assinatura?.plano?.nome ?? "Sem plano"],
    ["calendar-outline", "Vencimento", dataBr(assinatura?.proximo_vencimento)],
  ];
  return <Screen><ScrollView contentContainerStyle={styles.content}><TouchableOpacity onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={Colors.primaryDark}/></TouchableOpacity><View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>{String(gerador.nome??"G").charAt(0).toUpperCase()}</Text></View><Text style={styles.eyebrow}>INFORMAÇÕES DO GERADOR</Text><Text style={styles.title}>{gerador.nome}</Text><Text style={styles.subtitle}>{gerador.email ?? "E-mail não informado"}</Text><View style={styles.status}><Text>{assinatura?.status ?? (gerador.ativo ? "SEM ASSINATURA" : "INATIVO")}</Text></View></View><View style={styles.grid}>{metrics.map(([icon,label,value])=><View style={styles.metric} key={label}><Ionicons name={icon as any} size={22} color={Colors.primary}/><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>)}</View><View style={styles.info}><Text style={styles.infoTitle}>Dados da conta</Text><Row label="Telefone" value={gerador.telefone ?? "Não informado"}/><Row label="CPF" value={gerador.cpf ?? "Não informado"}/><Row label="Início do acesso" value={dataBr(assinatura?.inicio_em)}/><Row label="Situação da conta" value={gerador.ativo ? "Ativa" : "Inativa"}/></View></ScrollView></Screen>;
}

function Row({label,value}:{label:string;value:string}) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }

const styles=StyleSheet.create({content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},state:{flex:1,alignItems:"center",justifyContent:"center",gap:Spacing.md},back:{width:44,height:44,alignItems:"center",justifyContent:"center",marginBottom:Spacing.md,borderRadius:Radius.round,backgroundColor:Colors.primaryLight},hero:{alignItems:"center",padding:Spacing.xl,borderRadius:Radius.xl,backgroundColor:Colors.primaryDark,...Shadows.card},avatar:{width:68,height:68,alignItems:"center",justifyContent:"center",marginBottom:Spacing.md,borderRadius:Radius.round,backgroundColor:"#F7D75C"},avatarText:{color:Colors.primaryDark,fontSize:28,fontWeight:"900"},eyebrow:{color:"#A7F3D0",fontSize:10,fontWeight:"900",letterSpacing:1},title:{marginTop:5,color:"#FFF",fontSize:Typography.title,fontWeight:"900",textAlign:"center"},subtitle:{marginTop:4,color:"#CDEBDE",textAlign:"center"},status:{marginTop:Spacing.md,paddingHorizontal:12,paddingVertical:7,borderRadius:Radius.round,backgroundColor:"rgba(255,255,255,.12)"},grid:{flexDirection:"row",flexWrap:"wrap",gap:Spacing.sm,marginTop:Spacing.lg},metric:{width:"48%",minHeight:118,padding:Spacing.md,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.lg,backgroundColor:Colors.surface},metricLabel:{marginTop:Spacing.sm,color:Colors.subtitle,fontSize:11,fontWeight:"700"},metricValue:{marginTop:4,color:Colors.text,fontWeight:"900"},info:{marginTop:Spacing.lg,padding:Spacing.lg,borderRadius:Radius.xl,backgroundColor:Colors.surface},infoTitle:{marginBottom:Spacing.sm,color:Colors.text,fontSize:Typography.card,fontWeight:"900"},row:{flexDirection:"row",justifyContent:"space-between",gap:Spacing.md,paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.border},rowLabel:{color:Colors.subtitle},rowValue:{flex:1,color:Colors.text,fontWeight:"800",textAlign:"right"},link:{color:Colors.primary,fontWeight:"800"}});
