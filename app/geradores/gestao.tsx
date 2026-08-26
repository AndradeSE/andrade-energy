import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { alterarStatusAssinatura, contratarPlano, gerarCobrancaAssinatura, obterPainelComercial, PainelComercial } from "../../services/comercial.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

const money = (value: unknown) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export default function GestaoGeradores() {
  const { user } = useAuth();
  const [data, setData] = useState<PainelComercial | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setData(await obterPainelComercial()); } catch (error: any) { Alert.alert("Gestão comercial", error?.response?.data?.message ?? "Não foi possível carregar os dados."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (user?.perfil !== "ADMIN") return <Screen><View style={styles.blocked}><Ionicons name="lock-closed-outline" size={38} color={Colors.danger} /><Text style={styles.title}>Acesso restrito</Text><Text style={styles.subtitle}>Somente a administração gerencia planos e assinaturas.</Text><TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></TouchableOpacity></View></Screen>;
  return <Screen>
    <AppHeader variant="subpage" title="Gestão de geradores" subtitle="Planos, contratos e cobrança" contextTitle="Administração comercial" contextSubtitle="Receita recorrente e acessos" icon="business-outline" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}>
      {loading && !data ? <ActivityIndicator color={Colors.primary} /> : <>
        <View style={styles.metrics}>
          <Metric label="ASSINATURAS" value={String(data?.resumo.total ?? 0)} />
          <Metric label="ATIVAS" value={String(data?.resumo.ativas ?? 0)} success />
          <Metric label="INADIMPLENTES" value={String(data?.resumo.inadimplentes ?? 0)} danger />
          <Metric label="MRR PREVISTO" value={money(data?.resumo.receitaMensalPrevista)} />
        </View>
        <Text style={styles.section}>PLANOS COMERCIAIS</Text>
        {(data?.planos ?? []).map((plan) => <View style={styles.card} key={plan.id}><View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{plan.nome}</Text><Text style={styles.subtitle}>{plan.descricao}</Text></View><View style={styles.planPrice}><Text style={styles.price}>{money(plan.valor_mensal)}</Text><Text style={styles.muted}>/mês</Text></View></View><Text style={styles.resources}>{(plan.recursos ?? []).join(" • ")}</Text><Text style={styles.annual}>Anual: {money(plan.valor_anual)}</Text></View>)}
        <Text style={styles.section}>GERADORES E ASSINATURAS</Text>
        {(data?.geradores ?? []).filter((generator) => generator.perfil === "GESTOR" && !(data?.assinaturas ?? []).some((item) => item.gerador_id === generator.id && item.status !== "CANCELADA")).map((generator) => <View style={styles.card} key={generator.id}>
          <View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{generator.nome}</Text><Text style={styles.subtitle}>{generator.email}</Text></View><Text style={styles.badgeNeutral}>SEM PLANO</Text></View>
          <Text style={[styles.muted, { marginTop: Spacing.sm }]}>Vincule o plano ativo. A cobrança será gerada separadamente após a contratação.</Text>
          <View style={styles.actions}><Action label="Plano mensal" icon="calendar-outline" onPress={() => void create(generator.id, "MENSAL")} /><Action label="Plano anual" icon="calendar-number-outline" onPress={() => void create(generator.id, "ANUAL")} /></View>
        </View>)}
        {(data?.assinaturas ?? []).map((subscription) => <View style={styles.card} key={subscription.id}>
          <View style={styles.row}><View style={styles.grow}><Text style={styles.cardTitle}>{subscription.gerador?.nome ?? "Gerador"}</Text><Text style={styles.subtitle}>{subscription.gerador?.email ?? "—"}</Text></View><Text style={[styles.badge, subscription.status === "INADIMPLENTE" && styles.badgeDanger]}>{subscription.status}</Text></View>
          <View style={styles.detailRow}><Text>{subscription.plano?.nome ?? "Sem plano"} · {subscription.ciclo}</Text><Text>{money(subscription.valor_contratado)}</Text></View>
          <Text style={styles.muted}>Próximo vencimento: {date(subscription.proximo_vencimento)}</Text>
          <View style={styles.actions}><Action label="Gerar cobrança" icon="receipt-outline" onPress={async () => { try { await gerarCobrancaAssinatura(subscription.id); Alert.alert("Cobrança gerada", "A cobrança da assinatura foi criada no Asaas."); await load(); } catch (e: any) { Alert.alert("Cobrança", e?.response?.data?.message ?? "Não foi possível gerar."); } }} /><Action label={subscription.status === "SUSPENSA" ? "Reativar" : "Suspender"} icon={subscription.status === "SUSPENSA" ? "play-outline" : "pause-outline"} onPress={async () => { await alterarStatusAssinatura(subscription.id, subscription.status === "SUSPENSA" ? "ATIVA" : "SUSPENSA"); await load(); }} /></View>
        </View>)}
        {!data?.assinaturas.length ? <View style={styles.empty}><Text style={styles.cardTitle}>Nenhuma assinatura criada</Text><Text style={styles.subtitle}>Use o portal web para vincular o primeiro plano a um gerador.</Text></View> : null}
        <Text style={styles.section}>DOCUMENTOS COMERCIAIS</Text>
        <View style={styles.card}>{(data?.documentos ?? []).map((doc, index) => <View style={[styles.document, index > 0 && styles.border]} key={doc.id}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /><View style={styles.grow}><Text style={styles.documentTitle}>{doc.titulo}</Text><Text style={styles.muted}>Versão {doc.versao} · {doc.ativo ? "Publicada" : "Rascunho"}</Text></View></View>)}</View>
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={22} color={Colors.warning} /><Text style={styles.noticeText}>Contratos, termos e política de privacidade precisam de revisão jurídica antes da comercialização.</Text></View>
      </>}
    </ScrollView>
  </Screen>;

  async function create(geradorId: string, ciclo: "MENSAL" | "ANUAL") {
    const plan = data?.planos.find((item) => item.ativo);
    if (!plan) return Alert.alert("Plano", "Cadastre um plano ativo no portal web.");
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    try { await contratarPlano({ geradorId, planoId: plan.id, ciclo, formaPagamento: "BOLETO", inicioEm: new Date().toISOString().slice(0, 10), proximoVencimento: due }); Alert.alert("Assinatura criada", `${plan.nome} no ciclo ${ciclo.toLowerCase()} foi vinculado.`); await load(); }
    catch (error: any) { Alert.alert("Assinatura", error?.response?.data?.message ?? "Não foi possível vincular o plano."); }
  }
}

function Metric({ label, value, success, danger }: any) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, success && { color: Colors.primary }, danger && { color: Colors.danger }]}>{value}</Text></View>; }
function Action({ label, icon, onPress }: any) { return <TouchableOpacity style={styles.action} onPress={onPress}><Ionicons name={icon} size={18} color={Colors.primary} /><Text style={styles.actionText}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},blocked:{flex:1,alignItems:"center",justifyContent:"center",padding:Spacing.xl},title:{fontSize:Typography.section,fontWeight:"900",color:Colors.text,marginTop:Spacing.sm},subtitle:{color:Colors.subtitle,marginTop:3},link:{color:Colors.primary,fontWeight:"800",marginTop:Spacing.lg},metrics:{flexDirection:"row",flexWrap:"wrap",gap:Spacing.sm},metric:{width:"48%",backgroundColor:Colors.surface,borderRadius:Radius.lg,padding:Spacing.md,...Shadows.card},metricLabel:{fontSize:10,fontWeight:"800",color:Colors.subtitle},metricValue:{fontSize:20,fontWeight:"900",color:Colors.text,marginTop:6},section:{fontSize:12,fontWeight:"900",color:Colors.subtitle,letterSpacing:1,marginTop:Spacing.xl,marginBottom:Spacing.sm},card:{backgroundColor:Colors.surface,borderRadius:Radius.xl,padding:Spacing.lg,marginBottom:Spacing.md,...Shadows.card},row:{flexDirection:"row",alignItems:"flex-start",gap:Spacing.sm},grow:{flex:1},cardTitle:{fontSize:17,fontWeight:"900",color:Colors.text},planPrice:{alignItems:"flex-end"},price:{fontSize:17,fontWeight:"900",color:Colors.primary},muted:{fontSize:12,color:Colors.subtitle,marginTop:3},resources:{color:Colors.text,lineHeight:20,marginTop:Spacing.md},annual:{fontWeight:"800",color:Colors.text,marginTop:Spacing.sm},badge:{fontSize:10,fontWeight:"900",color:Colors.primary,backgroundColor:"#E9F7EF",paddingHorizontal:9,paddingVertical:5,borderRadius:99},badgeDanger:{color:Colors.danger,backgroundColor:"#FEECEC"},badgeNeutral:{fontSize:10,fontWeight:"900",color:Colors.subtitle,backgroundColor:"#EEF2F0",paddingHorizontal:9,paddingVertical:5,borderRadius:99},detailRow:{flexDirection:"row",justifyContent:"space-between",marginTop:Spacing.md},actions:{flexDirection:"row",gap:Spacing.sm,marginTop:Spacing.md},action:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,minHeight:44,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md},actionText:{fontSize:12,fontWeight:"800",color:Colors.primary},empty:{padding:Spacing.xl,alignItems:"center",backgroundColor:Colors.surface,borderRadius:Radius.xl},document:{flexDirection:"row",alignItems:"center",gap:Spacing.sm,paddingVertical:Spacing.sm},border:{borderTopWidth:1,borderTopColor:Colors.border},documentTitle:{fontWeight:"800",color:Colors.text},notice:{flexDirection:"row",gap:Spacing.sm,backgroundColor:"#FFF7E0",borderRadius:Radius.lg,padding:Spacing.md},noticeText:{flex:1,color:Colors.text,lineHeight:19} });
