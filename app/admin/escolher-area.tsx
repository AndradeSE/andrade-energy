import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import PortalBrandLogo from "../../components/brand/PortalBrandLogo";
import { useAuth } from "../../contexts/AuthContext";
import { Colors, Radius, Shadows, Spacing } from "../../theme";

export default function EscolherAreaAdmin() {
  const insets = useSafeAreaInsets();
  const { usuario, logout } = useAuth();
  if (usuario?.perfil !== "ADMIN") { router.replace("/selecionar-unidade"); return null; }
  return <SafeAreaView style={styles.screen}>
    <StatusBar backgroundColor="#082F26" barStyle="light-content" />
    <LinearGradient colors={["#082F26", "#0B4A39", "#0A5B43"]} style={[styles.hero, { marginTop: -insets.top, paddingTop: insets.top + Spacing.xl }]}>
      <PortalBrandLogo height={58} width={208} />
      <Text style={styles.eyebrow}>ACESSO ADMINISTRATIVO</Text><Text style={styles.title}>Qual área você deseja acessar?</Text><Text style={styles.subtitle}>Os ambientes comercial e operacional permanecem separados.</Text>
    </LinearGradient>
    <View style={styles.content}>
      <Area icon="briefcase-outline" color="#075E45" title="Gestão Comercial" description="Planos, assinaturas, cobranças, contratos e contas geradoras." onPress={() => router.replace("/admin/comercial" as any)} />
      <Area icon="sunny-outline" color="#A66A00" title="Gestão de Usinas" description="Usinas, clientes, unidades, produção, faturas e operação." onPress={() => router.replace("/selecionar-unidade")} />
      <TouchableOpacity onPress={() => void logout()} style={styles.logout}><Ionicons name="log-out-outline" size={19} color={Colors.danger} /><Text style={styles.logoutText}>Sair da conta</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}

function Area({ icon, color, title, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; description: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} onPress={onPress} style={styles.card}><View style={[styles.icon, { backgroundColor: color }]}><Ionicons name={icon} size={30} color="#FFF" /></View><View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{description}</Text><Text style={[styles.open, { color }]}>Acessar ambiente <Ionicons name="arrow-forward" size={14} /></Text></View></TouchableOpacity>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:Colors.background},hero:{alignItems:"center",paddingHorizontal:Spacing.xl,paddingTop:Spacing.xl,paddingBottom:Spacing.xxl,borderBottomLeftRadius:30,borderBottomRightRadius:30},eyebrow:{marginTop:Spacing.lg,color:"#A7F3D0",fontSize:11,fontWeight:"900",letterSpacing:1.2},title:{marginTop:7,color:"#FFF",fontSize:26,fontWeight:"900",textAlign:"center"},subtitle:{marginTop:7,color:"#CDEBDE",fontSize:14,lineHeight:20,textAlign:"center"},content:{padding:Spacing.lg,gap:Spacing.md},card:{minHeight:150,flexDirection:"row",alignItems:"center",padding:Spacing.lg,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.xl,backgroundColor:Colors.surface,...Shadows.card},icon:{width:62,height:62,alignItems:"center",justifyContent:"center",borderRadius:Radius.lg},copy:{flex:1,marginLeft:Spacing.md},cardTitle:{color:Colors.text,fontSize:20,fontWeight:"900"},cardText:{marginTop:5,color:Colors.subtitle,fontSize:13,lineHeight:19},open:{marginTop:Spacing.sm,fontSize:12,fontWeight:"900"},logout:{minHeight:50,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:Spacing.sm},logoutText:{color:Colors.danger,fontWeight:"800"} });
