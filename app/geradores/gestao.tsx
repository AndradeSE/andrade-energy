import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PortalBrandLogo from "../../components/brand/PortalBrandLogo";
import { ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { alterarStatusAssinatura, contratarPlano, gerarCobrancaAssinatura, obterPainelComercial, PainelComercial } from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const money = (value: unknown) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export default function GestaoGeradores() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ aba?: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"RESUMO" | "GERADORES" | "ASSINATURAS" | "PAGAMENTOS" | "PLANOS" | "DOCUMENTOS">(params.aba === "PAGAMENTOS" ? "PAGAMENTOS" : "RESUMO");
  const load = useCallback(async () => { try { setData(await obterPainelComercial()); } catch (error: any) { Alert.alert("Gestão comercial", error?.response?.data?.message ?? "Não foi possível carregar os dados."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (user?.perfil !== "ADMIN") return <Screen><View style={styles.blocked}><Ionicons name="lock-closed-outline" size={38} color={Colors.danger} /><Text style={styles.title}>Acesso restrito</Text><Text style={styles.subtitle}>Somente a administração gerencia planos e assinaturas.</Text><TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></TouchableOpacity></View></Screen>;
  return <Screen>
    <StatusBar backgroundColor="#082F26" barStyle="light-content" />
    <LinearGradient colors={["#082F26", "#0B4A39", "#0A5B43"]} end={{ x: 1, y: 0.85 }} start={{ x: 0, y: 0 }} style={[styles.header, { marginTop: -insets.top, paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity accessibilityLabel="Voltar para a gestão comercial" activeOpacity={0.78} onPress={() => router.replace("/admin/comercial" as any)} style={styles.headerAction}><Ionicons name="chevron-back" size={25} color="#FFF" /></TouchableOpacity>
        <PortalBrandLogo height={34} width={118} />
        <TouchableOpacity accessibilityLabel="Abrir perfil" activeOpacity={0.78} onPress={() => router.push({ pathname: "/admin/perfil", params: { origem: "comercial" } } as any)} style={styles.headerAction}><Ionicons name="person-outline" size={21} color="#FFF" /></TouchableOpacity>
      </View>
      <View style={styles.headerBody}>
        <View style={styles.headerIcon}><Ionicons name="business-outline" size={22} color="#F6CC32" /></View>
        <View style={styles.headerCopy}><Text style={styles.headerEyebrow}>ADMINISTRAÇÃO COMERCIAL</Text><Text style={styles.headerTitle}>Gestão de geradores</Text><Text style={styles.headerSubtitle}>Planos, contratos, cobranças e acessos em um só lugar.</Text></View>
      </View>
      <TouchableOpacity accessibilityLabel="Trocar ambiente de gestão" activeOpacity={0.82} onPress={() => router.replace("/admin/escolher-area" as any)} style={styles.environmentSwitch}><View style={styles.environmentCurrent}><View style={styles.liveDot} /><Text style={styles.environmentLabel}>Ambiente comercial</Text></View><Text style={styles.environmentAction}>Trocar</Text><Ionicons name="chevron-forward" size={14} color="#F6CC32" /></TouchableOpacity>
    </LinearGradient>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}>
      {loading && !data ? <ActivityIndicator color={Colors.primary} /> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{([['RESUMO','Visão geral'],['GERADORES','Geradores'],['ASSINATURAS','Assinaturas'],['PAGAMENTOS','Pagamentos'],['PLANOS','Planos'],['DOCUMENTOS','Documentos']] as const).map(([key,label])=><TouchableOpacity key={key} onPress={()=>setAba(key)} style={[styles.tab,aba===key&&styles.tabActive]}><Text style={[styles.tabText,aba===key&&styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}</ScrollView>
        {aba === "RESUMO" ? <>
        <View style={styles.metrics}>
          <Metric label="ASSINATURAS" value={String(data?.resumo.total ?? 0)} />
          <Metric label="ATIVAS" value={String(data?.resumo.ativas ?? 0)} success />
          <Metric label="INADIMPLENTES" value={String(data?.resumo.inadimplentes ?? 0)} danger />
          <Metric label="MRR PREVISTO" value={money(data?.resumo.receitaMensalPrevista)} />
        </View>
        <View style={styles.overviewGrid}><TouchableOpacity onPress={()=>setAba("GERADORES")} style={styles.overviewCard}><Ionicons name="people-outline" size={24} color={Colors.primary}/><Text style={styles.overviewValue}>{data?.geradores.filter(item=>item.perfil==="GESTOR").length??0}</Text><Text style={styles.muted}>contas geradoras</Text></TouchableOpacity><TouchableOpacity onPress={()=>setAba("ASSINATURAS")} style={styles.overviewCard}><Ionicons name="card-outline" size={24} color={Colors.primary}/><Text style={styles.overviewValue}>{data?.assinaturas.length??0}</Text><Text style={styles.muted}>licenças cadastradas</Text></TouchableOpacity></View>
        </> : null}
        {aba === "PLANOS" ? <>
        <Text style={styles.section}>PLANOS COMERCIAIS</Text>
        {(data?.planos ?? []).map((plan) => <View style={styles.card} key={plan.id}><View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{plan.nome}</Text><Text style={styles.subtitle}>{plan.descricao}</Text></View><View style={styles.planPrice}><Text style={styles.price}>{money(plan.valor_mensal)}</Text><Text style={styles.muted}>/mês</Text></View></View><Text style={styles.resources}>{(plan.recursos ?? []).join(" • ")}</Text><Text style={styles.annual}>Anual: {money(plan.valor_anual)}</Text></View>)}
        </> : null}
        {aba === "GERADORES" ? <>
        <Text style={styles.section}>GERADORES E ASSINATURAS</Text>
        {(data?.geradores ?? []).filter((generator) => generator.perfil === "GESTOR" && !(data?.assinaturas ?? []).some((item) => item.gerador_id === generator.id && item.status !== "CANCELADA")).map((generator) => <View style={styles.card} key={generator.id}>
          <View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{generator.nome}</Text><Text style={styles.subtitle}>{generator.email}</Text></View><Text style={styles.badgeNeutral}>SEM PLANO</Text></View>
          <Text style={[styles.muted, { marginTop: Spacing.sm }]}>Vincule o plano ativo. A cobrança será gerada separadamente após a contratação.</Text>
          <View style={styles.trialNote}><Ionicons name="gift-outline" size={16} color={Colors.primary}/><Text style={styles.trialNoteText}>45 dias de teste antes da primeira cobrança</Text></View>
          <View style={styles.actions}><Action label="Plano mensal" icon="calendar-outline" onPress={() => void create(generator.id, "MENSAL")} /><Action label="Plano anual" icon="calendar-number-outline" onPress={() => void create(generator.id, "ANUAL")} /></View>
        </View>)}
        </> : null}
        {aba === "ASSINATURAS" ? <>
        {(data?.assinaturas ?? []).map((subscription) => <View style={styles.card} key={subscription.id}>
          <View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{subscription.gerador?.nome ?? "Gerador"}</Text><Text style={styles.subtitle}>{subscription.gerador?.email ?? "—"}</Text></View><Text style={[styles.badge, subscription.status === "INADIMPLENTE" && styles.badgeDanger]}>{subscription.status}</Text></View>
          <View style={styles.detailRow}><Text>{subscription.plano?.nome ?? "Sem plano"} · {subscription.ciclo}</Text><Text>{money(subscription.valor_contratado)}</Text></View>
          <Text style={styles.muted}>Próximo vencimento: {date(subscription.proximo_vencimento)}</Text>
          <View style={styles.actions}><Action label="Gerar cobrança" icon="receipt-outline" onPress={async () => { try { await gerarCobrancaAssinatura(subscription.id); Alert.alert("Cobrança gerada", "A cobrança da assinatura foi criada no Asaas."); await load(); } catch (e: any) { Alert.alert("Cobrança", e?.response?.data?.message ?? "Não foi possível gerar."); } }} /><Action label={subscription.status === "SUSPENSA" ? "Reativar" : "Suspender"} icon={subscription.status === "SUSPENSA" ? "play-outline" : "pause-outline"} onPress={async () => { try { await alterarStatusAssinatura(subscription.id, subscription.status === "SUSPENSA" ? "ATIVA" : "SUSPENSA"); await load(); } catch (e: any) { Alert.alert("Assinatura", e?.response?.data?.message ?? "Não foi possível alterar o status."); } }} /></View>
        </View>)}
        {!data?.assinaturas.length ? <View style={styles.empty}><Text style={styles.cardTitle}>Nenhuma assinatura criada</Text><Text style={styles.subtitle}>Use o portal web para vincular o primeiro plano a um gerador.</Text></View> : null}
        </> : null}
        {aba === "PAGAMENTOS" ? <>
        <View style={styles.paymentSummary}><View><Text style={styles.paymentSummaryLabel}>RECEBIDO NO MÊS</Text><Text style={styles.paymentSummaryValue}>{money(data?.financeiro?.recebidoNoMes)}</Text></View><View style={styles.paymentSummarySide}><Text style={styles.paymentSummarySideValue}>{money(data?.financeiro?.pendenteNoMes)}</Text><Text style={styles.muted}>a receber</Text></View></View>
        <Text style={styles.section}>FATURAMENTO DAS ASSINATURAS</Text>
        {(data?.cobrancas ?? []).map((charge) => { const status = String(charge.status ?? "PENDENTE"); const customer = charge.assinatura?.gerador?.nome ?? "Gerador"; const paymentUrl = charge.bank_slip_url ?? charge.invoice_url; return <View style={styles.card} key={charge.id}><View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{customer}</Text><Text style={styles.subtitle}>{charge.competencia} · vence em {date(charge.vencimento)}</Text></View><Text style={[styles.badge,status==="VENCIDA"&&styles.badgeDanger,status==="PENDENTE"&&styles.badgePending]}>{status}</Text></View><View style={styles.paymentValueRow}><Text style={styles.paymentValue}>{money(charge.valor)}</Text><Text style={styles.muted}>{charge.assinatura?.plano?.nome ?? "Licença Andrade Energy"}</Text></View>{paymentUrl?<TouchableOpacity onPress={()=>void Linking.openURL(paymentUrl)} style={styles.openPayment}><Ionicons name="open-outline" size={17} color={Colors.primary}/><Text style={styles.openPaymentText}>Abrir cobrança</Text></TouchableOpacity>:null}</View>; })}
        {!data?.cobrancas.length ? <View style={styles.empty}><Ionicons name="receipt-outline" size={28} color={Colors.primary}/><Text style={styles.cardTitle}>Nenhuma cobrança gerada</Text><Text style={styles.subtitle}>Abra Assinaturas e use “Gerar cobrança” para iniciar o faturamento.</Text></View>:null}
        <View style={styles.notice}><Ionicons name="sync-circle-outline" size={22} color={Colors.primary}/><Text style={styles.noticeText}>Pagamentos são conciliados automaticamente pelo webhook do Asaas. O gerador pode optar pela recorrência em cartão ou Pix em “Minha assinatura”; sem recorrência, a administração gera a cobrança avulsa.</Text></View>
        </> : null}
        {aba === "DOCUMENTOS" ? <>
        <Text style={styles.section}>DOCUMENTOS COMERCIAIS</Text>
        <View style={styles.card}>{(data?.documentos ?? []).map((doc, index) => <View style={[styles.document, index > 0 && styles.border]} key={doc.id}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /><View style={styles.grow}><Text style={styles.documentTitle}>{doc.titulo}</Text><Text style={styles.muted}>Versão {doc.versao} · {doc.ativo ? "Publicada" : "Rascunho"}</Text></View></View>)}</View>
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={22} color={Colors.warning} /><Text style={styles.noticeText}>Contratos, termos e política de privacidade precisam de revisão jurídica antes da comercialização.</Text></View>
        </> : null}
      </>}
    </ScrollView>
  </Screen>;

  async function create(geradorId: string, ciclo: "MENSAL" | "ANUAL") {
    const plan = data?.planos.find((item) => item.ativo);
    if (!plan) return Alert.alert("Plano", "Cadastre um plano ativo no portal web.");
    const due = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    try { const result = await contratarPlano({ geradorId, planoId: plan.id, ciclo, formaPagamento: "BOLETO", diasTeste: 45, inicioEm: new Date().toISOString().slice(0, 10), proximoVencimento: due }); Alert.alert(result.teste_concedido ? "Teste ativado" : "Assinatura ativada", result.teste_concedido ? `${plan.nome} foi vinculado com 45 dias de teste. A primeira cobrança vence em ${date(due)}.` : "Este CPF já utilizou o teste gratuito. O plano foi ativado sem um novo período de teste."); await load(); }
    catch (error: any) { Alert.alert("Assinatura", error?.response?.data?.message ?? "Não foi possível vincular o plano."); }
  }
}

function Metric({ label, value, success, danger }: any) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, success && { color: Colors.primary }, danger && { color: Colors.danger }]}>{value}</Text></View>; }
function Action({ label, icon, onPress }: any) { return <TouchableOpacity style={styles.action} onPress={onPress}><Ionicons name={icon} size={18} color={Colors.primary} /><Text style={styles.actionText}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ header:{paddingHorizontal:Spacing.lg,paddingBottom:Spacing.lg},headerTop:{minHeight:50,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},headerAction:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:Radius.round,backgroundColor:"rgba(255,255,255,.09)"},headerBody:{flexDirection:"row",alignItems:"flex-start",marginTop:Spacing.md},headerIcon:{width:48,height:48,alignItems:"center",justifyContent:"center",borderRadius:Radius.lg,backgroundColor:"rgba(255,255,255,.10)"},headerCopy:{flex:1,minWidth:0,marginLeft:Spacing.md},headerEyebrow:{color:"#A7F3D0",fontSize:10,fontWeight:"900",letterSpacing:1},headerTitle:{marginTop:3,color:"#FFF",fontSize:24,fontWeight:"900"},headerSubtitle:{marginTop:5,color:"rgba(255,255,255,.79)",fontSize:13,lineHeight:19},environmentSwitch:{minHeight:42,flexDirection:"row",alignItems:"center",marginTop:Spacing.md,paddingHorizontal:Spacing.sm,borderTopWidth:1,borderTopColor:"rgba(255,255,255,.12)"},environmentCurrent:{flex:1,flexDirection:"row",alignItems:"center",gap:7},liveDot:{width:7,height:7,borderRadius:99,backgroundColor:"#6EE7B7"},environmentLabel:{color:"#D8F0E3",fontSize:12,fontWeight:"700"},environmentAction:{marginRight:4,color:"#F6CC32",fontSize:11,fontWeight:"900"},content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},tabs:{gap:8,paddingBottom:Spacing.md},tab:{paddingHorizontal:15,paddingVertical:10,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.round,backgroundColor:"#E8F1EC"},tabActive:{borderColor:Colors.primary,backgroundColor:Colors.primary},tabText:{color:Colors.text,fontSize:12,fontWeight:"800"},tabTextActive:{color:"#FFF"},overviewGrid:{flexDirection:"row",gap:Spacing.sm,marginTop:Spacing.md},overviewCard:{flex:1,padding:Spacing.md,borderRadius:Radius.lg,backgroundColor:"#DDEBE4"},overviewValue:{marginTop:7,color:Colors.text,fontSize:22,fontWeight:"900"},blocked:{flex:1,alignItems:"center",justifyContent:"center",padding:Spacing.xl},title:{fontSize:Typography.section,fontWeight:"900",color:Colors.text,marginTop:Spacing.sm},subtitle:{color:Colors.subtitle,marginTop:3},link:{color:Colors.primary,fontWeight:"800",marginTop:Spacing.lg},metrics:{flexDirection:"row",flexWrap:"wrap",gap:Spacing.sm},metric:{width:"48%",backgroundColor:"#E8F1EC",borderRadius:Radius.lg,padding:Spacing.md,...Shadows.card},metricLabel:{fontSize:10,fontWeight:"800",color:Colors.subtitle},metricValue:{fontSize:20,fontWeight:"900",color:Colors.text,marginTop:6},section:{fontSize:12,fontWeight:"900",color:Colors.subtitle,letterSpacing:1,marginTop:Spacing.xl,marginBottom:Spacing.sm},card:{backgroundColor:"#F1F6F3",borderWidth:1,borderColor:"#C7D9D0",borderRadius:Radius.xl,padding:Spacing.lg,marginBottom:Spacing.md,...Shadows.card},row:{flexDirection:"row",alignItems:"flex-start",gap:Spacing.sm},grow:{flex:1},cardTitle:{fontSize:17,fontWeight:"900",color:Colors.text},planPrice:{alignItems:"flex-end"},price:{fontSize:17,fontWeight:"900",color:Colors.primary},muted:{fontSize:12,color:Colors.subtitle,marginTop:3},resources:{color:Colors.text,lineHeight:20,marginTop:Spacing.md},annual:{fontWeight:"800",color:Colors.text,marginTop:Spacing.sm},badge:{fontSize:10,fontWeight:"900",color:Colors.primary,backgroundColor:"#E9F7EF",paddingHorizontal:9,paddingVertical:5,borderRadius:99},badgeDanger:{color:Colors.danger,backgroundColor:"#FEECEC"},badgePending:{color:"#9A6700",backgroundColor:"#FFF3CD"},badgeNeutral:{fontSize:10,fontWeight:"900",color:Colors.subtitle,backgroundColor:"#EEF2F0",paddingHorizontal:9,paddingVertical:5,borderRadius:99},detailRow:{flexDirection:"row",justifyContent:"space-between",marginTop:Spacing.md},trialNote:{flexDirection:"row",alignItems:"center",gap:6,marginTop:Spacing.md,padding:Spacing.sm,borderRadius:Radius.md,backgroundColor:Colors.primaryLight},trialNoteText:{flex:1,color:Colors.primary,fontSize:11,fontWeight:"800"},actions:{flexDirection:"row",gap:Spacing.sm,marginTop:Spacing.md},action:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,minHeight:44,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md},actionText:{fontSize:12,fontWeight:"800",color:Colors.primary},paymentSummary:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:Spacing.lg,borderRadius:Radius.xl,backgroundColor:"#0A513E",...Shadows.card},paymentSummaryLabel:{color:"#A7F3D0",fontSize:10,fontWeight:"900",letterSpacing:.8},paymentSummaryValue:{marginTop:5,color:"#FFF",fontSize:27,fontWeight:"900"},paymentSummarySide:{alignItems:"flex-end"},paymentSummarySideValue:{color:"#F6CC32",fontSize:17,fontWeight:"900"},paymentValueRow:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",marginTop:Spacing.md},paymentValue:{color:Colors.text,fontSize:22,fontWeight:"900"},openPayment:{minHeight:42,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,marginTop:Spacing.md,borderWidth:1,borderColor:Colors.primary,borderRadius:Radius.md},openPaymentText:{color:Colors.primary,fontSize:12,fontWeight:"900"},empty:{padding:Spacing.xl,alignItems:"center",backgroundColor:"#E8F1EC",borderRadius:Radius.xl},document:{flexDirection:"row",alignItems:"center",gap:Spacing.sm,paddingVertical:Spacing.sm},border:{borderTopWidth:1,borderTopColor:Colors.border},documentTitle:{fontWeight:"800",color:Colors.text},notice:{flexDirection:"row",gap:Spacing.sm,backgroundColor:"#FFF7E0",borderRadius:Radius.lg,padding:Spacing.md},noticeText:{flex:1,color:Colors.text,lineHeight:19} });
