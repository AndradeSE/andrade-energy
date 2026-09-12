import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { listarAuditoriaColaboradores } from "../../services/colaboradores.service";
import { AppHeader, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { Colors, Spacing, Typography } from "../../theme";
import CommercialTabs from "../../components/commercial/CommercialTabs";

const verbos: Record<string, string> = {
  GET: "Consultou",
  POST: "Criou ou enviou",
  PUT: "Atualizou",
  PATCH: "Alterou",
  DELETE: "Excluiu ou cancelou",
};

const areas: Record<string, string> = {
  clientes: "clientes",
  usinas: "usinas",
  contratos: "contratos",
  faturas: "faturas",
  rateio: "rateios",
  creditos: "créditos",
  fechamentos: "fechamentos",
  comercial: "gestão comercial",
  colaboradores: "equipe",
  dashboard: "painel",
};

export default function AtividadeEquipe() {
  const { ambiente } = useLocalSearchParams<{ ambiente?: string }>();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    try { setItens(await listarAuditoriaColaboradores()); }
    catch (error: any) { Alert.alert("Atividade da equipe", error?.response?.data?.message ?? "Não foi possível carregar o histórico."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  return <Screen edges={["top", "left", "right"]}>
    <AppHeader variant="subpage" title="Atividade da equipe" subtitle="Histórico individual" contextTitle="Auditoria de colaboradores" contextSubtitle="Quem fez, onde e quando" icon="time-outline" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => { setCarregando(true); void carregar(); }} colors={[Colors.primary]} />}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.primary}/><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
      <Text style={styles.title}>Ações registradas</Text>
      <Text style={styles.subtitle}>Cada operação feita por um colaborador fica vinculada ao login utilizado. O histórico não exibe senhas nem dados preenchidos nos formulários.</Text>
      {carregando ? <ActivityIndicator color={Colors.primary}/> : itens.length ? itens.map((item) => <AuditCard key={item.id} item={item}/>) : <Card><Text style={styles.empty}>Nenhuma ação de colaborador registrada ainda.</Text></Card>}
    </ScrollView>
    {ambiente === "comercial" ? <CommercialTabs /> : null}
  </Screen>;
}

function AuditCard({ item }: { item: any }) {
  const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
  const metodo = String(item.acao ?? "").replace("COLABORADOR_", "");
  const data = new Date(item.criado_em);
  return <Card style={styles.card}>
    <View style={styles.row}><View style={styles.icon}><Ionicons name="person-outline" size={19} color={Colors.primary}/></View><View style={styles.grow}><Text style={styles.name}>{usuario?.nome ?? "Colaborador removido"}</Text><Text style={styles.action}>{verbos[metodo] ?? "Acessou"} {areas[item.recurso] ?? item.recurso}</Text></View><Text style={[styles.status, Number(item.detalhes?.status) >= 400 && styles.statusError]}>{Number(item.detalhes?.status) < 400 ? "CONCLUÍDA" : "FALHOU"}</Text></View>
    <Text style={styles.date}>{data.toLocaleDateString("pt-BR")} às {data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text>
  </Card>;
}

const styles = StyleSheet.create({content:{padding:Spacing.lg,paddingBottom:Spacing.xxl*3},back:{flexDirection:"row",alignItems:"center",gap:6,marginBottom:Spacing.md},backText:{color:Colors.primary,fontWeight:"800"},title:{color:Colors.text,fontSize:Typography.title,fontWeight:"900"},subtitle:{marginTop:6,marginBottom:Spacing.lg,color:Colors.subtitle,lineHeight:20},card:{marginBottom:Spacing.md},row:{flexDirection:"row",alignItems:"center",gap:10},icon:{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center",backgroundColor:Colors.primaryLight},grow:{flex:1},name:{color:Colors.text,fontWeight:"900"},action:{marginTop:3,color:Colors.subtitle,fontSize:12},status:{color:Colors.primary,fontSize:9,fontWeight:"900"},statusError:{color:Colors.danger},date:{marginTop:10,paddingTop:8,borderTopWidth:1,borderTopColor:Colors.border,color:Colors.subtitle,fontSize:11},empty:{color:Colors.subtitle,textAlign:"center"}});
