import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AppHeader, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { atualizarColaborador, cancelarConviteColaborador, convidarColaborador, listarColaboradores, reenviarConviteColaborador } from "../../services/colaboradores.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import CommercialTabs from "../../components/commercial/CommercialTabs";

const GERADOR = { usinas: "Usinas", clientes: "Clientes", unidades: "Unidades consumidoras", contratos: "Contratos", faturas: "Faturas", operacao: "Operação" };
const COMERCIAL = { geradores: "Geradores", monitoramento: "Monitoramento", documentos: "Documentos" };

export default function Colaboradores() {
  const { user } = useAuth();
  const { ambiente } = useLocalSearchParams<{ ambiente?: string }>();
  const admin = user?.perfil === "ADMIN";
  const comercial = ambiente === "comercial" || (admin && ambiente !== "gerador");
  const papel = comercial ? "COLABORADOR_COMERCIAL" : "COLABORADOR_GERADOR";
  const campos = papel === "COLABORADOR_COMERCIAL" ? COMERCIAL : GERADOR;
  const [nome, setNome] = useState(""); const [cpf, setCpf] = useState(""); const [email, setEmail] = useState(""); const [telefone, setTelefone] = useState("");
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({});
  const [dados, setDados] = useState<any>({ colaboradores: [], convites: [] });
  const [carregando, setCarregando] = useState(true); const [enviando, setEnviando] = useState(false);
  const carregar = useCallback(async () => { try { setDados(await listarColaboradores()); } catch (e: any) { Alert.alert("Colaboradores", e?.response?.data?.message ?? "Não foi possível carregar."); } finally { setCarregando(false); } }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setPermissoes(Object.fromEntries(Object.keys(campos).map((chave) => [chave, true]))); }, [papel]);
  const lista = useMemo(() => [...(dados.colaboradores ?? []).map((item: any) => ({ ...item, pendente: false })), ...(dados.convites ?? []).map((item: any) => ({ ...item, pendente: true }))], [dados]);

  async function enviar() {
    try {
      setEnviando(true);
      const resultado = await convidarColaborador({ nome, cpf, email, telefone, papel, permissoes });
      setNome(""); setCpf(""); setEmail(""); setTelefone(""); await carregar();
      Alert.alert("Convite criado", resultado.emailEnviado ? "O convite foi enviado por e-mail." : `O e-mail não foi entregue. Compartilhe este código:\n\n${resultado.token ?? ""}`);
    } catch (e: any) { Alert.alert("Não foi possível convidar", e?.response?.data?.message ?? "Confira os dados."); } finally { setEnviando(false); }
  }

  return <Screen edges={["top", "left", "right"]}>
    <AppHeader variant="subpage" title="Colaboradores" subtitle="Equipe e permissões" contextTitle="Gestão de acessos" contextSubtitle="Convites e acessos operacionais" icon="people-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.primary}/><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
      <Text style={styles.title}>{comercial ? "Convidar para a equipe comercial" : "Convidar para a equipe do gerador"}</Text>
      <Text style={styles.subtitle}>{comercial ? "Este acesso permite auxiliar na gestão dos geradores, sem carteira, pagamentos, planos ou ferramentas exclusivas do ADM." : "Este acesso pertence somente a esta operação geradora. Carteira, recebíveis, transferências e ferramentas do titular continuam bloqueados."}</Text>
      <Card style={styles.form}>
        <Field label="Nome completo" value={nome} onChangeText={setNome}/><Field label="CPF" value={cpf} onChangeText={(v: string) => setCpf(v.replace(/\D/g, "").slice(0, 11))} keyboardType="numeric"/><Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/><Field label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad"/>
        <Text style={styles.permissionTitle}>PERMISSÕES OPERACIONAIS</Text>
        {Object.entries(campos).map(([chave, label]) => <View key={chave} style={styles.permission}><Text style={styles.permissionText}>{label}</Text><Switch value={permissoes[chave] !== false} onValueChange={(valor) => setPermissoes((atual) => ({ ...atual, [chave]: valor }))} trackColor={{ false: Colors.border, true: Colors.primary }}/></View>)}
        <TouchableOpacity disabled={enviando} onPress={() => void enviar()} style={[styles.primary, enviando && styles.disabled]}>{enviando ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>Enviar convite</Text>}</TouchableOpacity>
      </Card>
      <Text style={[styles.title, styles.teamTitle]}>Equipe e convites</Text>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/colaboradores/atividade", params: { ambiente: ambiente ?? (admin ? "comercial" : "gerador") } } as any)}
        style={styles.auditButton}
      >
        <Ionicons name="time-outline" size={18} color={Colors.primary} />
        <Text style={styles.auditLink}>Ver atividades dos colaboradores</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
      </TouchableOpacity>
      {carregando ? <ActivityIndicator color={Colors.primary}/> : lista.length ? lista.map((item: any) => <Member key={`${item.pendente}-${item.id}`} item={item} onChange={carregar}/>) : <Card><Text style={styles.empty}>Nenhum colaborador ou convite cadastrado.</Text></Card>}
    </ScrollView>
    {comercial ? <CommercialTabs /> : null}
  </Screen>;
}

function Member({ item, onChange }: any) {
  const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
  const nome = item.nome ?? usuario?.nome ?? "Colaborador"; const email = item.email ?? usuario?.email ?? "";
  const ativo = item.pendente ? item.status === "PENDENTE" : item.ativo;
  async function executar(acao: () => Promise<any>, sucesso: string) { try { const resposta = await acao(); await onChange(); Alert.alert(sucesso, resposta?.token ? `Compartilhe o código:\n\n${resposta.token}` : "Operação concluída."); } catch (e: any) { Alert.alert("Colaboradores", e?.response?.data?.message ?? "Não foi possível concluir."); } }
  const opcoes = item.papel === "COLABORADOR_COMERCIAL" ? COMERCIAL : GERADOR;
  return <Card style={styles.member}><View style={styles.memberTop}><View style={styles.avatar}><Text style={styles.avatarText}>{nome.charAt(0).toUpperCase()}</Text></View><View style={styles.grow}><Text style={styles.memberName}>{nome}</Text><Text style={styles.memberEmail}>{email}</Text></View><Text style={[styles.badge, ativo && styles.badgeActive]}>{item.pendente ? item.status : ativo ? "ATIVO" : "BLOQUEADO"}</Text></View><Text style={styles.role}>{item.papel === "COLABORADOR_COMERCIAL" ? "Equipe comercial" : "Equipe do gerador"}</Text>{!item.pendente ? Object.entries(opcoes).map(([chave, label]) => <View style={styles.memberPermission} key={chave}><Text style={styles.memberPermissionText}>{label}</Text><Switch disabled={!ativo} value={item.permissoes?.[chave] !== false} onValueChange={(valor) => void executar(() => atualizarColaborador(item.id, { permissoes: { ...item.permissoes, [chave]: valor } }), "Permissões atualizadas")} trackColor={{ false: Colors.border, true: Colors.primary }}/></View>) : null}<View style={styles.actions}>{item.pendente ? <><TouchableOpacity onPress={() => void executar(() => reenviarConviteColaborador(item.id), "Convite reenviado")}><Text style={styles.action}>Reenviar</Text></TouchableOpacity><TouchableOpacity onPress={() => void executar(() => cancelarConviteColaborador(item.id), "Convite cancelado")}><Text style={styles.actionDanger}>Cancelar</Text></TouchableOpacity></> : <TouchableOpacity onPress={() => void executar(() => atualizarColaborador(item.id, { ativo: !ativo }), ativo ? "Acesso bloqueado" : "Acesso reativado")}><Text style={ativo ? styles.actionDanger : styles.action}>{ativo ? "Bloquear acesso" : "Reativar acesso"}</Text></TouchableOpacity>}</View></Card>;
}

function Field(props: any) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input}/></View>; }
const styles = StyleSheet.create({ content:{padding:Spacing.lg,paddingBottom:Spacing.xxl*3},back:{flexDirection:"row",alignItems:"center",gap:6,marginBottom:Spacing.md},backText:{color:Colors.primary,fontWeight:"800"},title:{marginTop:Spacing.sm,color:Colors.text,fontSize:Typography.title,fontWeight:"900"},teamTitle:{marginBottom:Spacing.sm},auditButton:{minHeight:48,flexDirection:"row",alignItems:"center",gap:8,marginBottom:Spacing.md,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:"#C9DED1",borderRadius:Radius.md,backgroundColor:"#F4FAF6"},auditLink:{flex:1,color:Colors.primary,fontSize:12,fontWeight:"900"},subtitle:{marginTop:6,marginBottom:Spacing.md,color:Colors.subtitle,lineHeight:20},types:{flexDirection:"row",gap:8,marginBottom:Spacing.md},type:{flex:1,padding:12,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.round,alignItems:"center"},typeActive:{borderColor:Colors.primary,backgroundColor:Colors.primaryLight},typeText:{color:Colors.subtitle,fontSize:12,fontWeight:"800"},typeTextActive:{color:Colors.primary},form:{marginBottom:Spacing.xl},field:{marginBottom:Spacing.sm},label:{marginBottom:5,color:Colors.text,fontSize:12,fontWeight:"800"},input:{minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,color:Colors.text,backgroundColor:Colors.surface},permissionTitle:{marginTop:Spacing.md,marginBottom:4,color:Colors.subtitle,fontSize:10,fontWeight:"900",letterSpacing:.8},permission:{minHeight:46,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:Colors.border},permissionText:{color:Colors.text,fontWeight:"700"},primary:{minHeight:52,alignItems:"center",justifyContent:"center",marginTop:Spacing.md,borderRadius:Radius.md,backgroundColor:Colors.primary},primaryText:{color:"#FFF",fontWeight:"900"},disabled:{opacity:.6},empty:{color:Colors.subtitle,textAlign:"center"},member:{marginTop:0},memberTop:{flexDirection:"row",alignItems:"center",gap:10},avatar:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",backgroundColor:Colors.primaryLight},avatarText:{color:Colors.primary,fontWeight:"900"},grow:{flex:1},memberName:{color:Colors.text,fontWeight:"900"},memberEmail:{marginTop:2,color:Colors.subtitle,fontSize:12},badge:{paddingHorizontal:8,paddingVertical:4,borderRadius:999,backgroundColor:"#FEE2E2",color:"#991B1B",fontSize:9,fontWeight:"900"},badgeActive:{backgroundColor:"#DCFCE7",color:"#166534"},role:{marginTop:10,color:Colors.subtitle,fontSize:12,fontWeight:"700"},memberPermission:{minHeight:40,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:4},memberPermissionText:{color:Colors.text,fontSize:12,fontWeight:"700"},actions:{flexDirection:"row",gap:20,marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:Colors.border},action:{color:Colors.primary,fontWeight:"900"},actionDanger:{color:Colors.danger,fontWeight:"900"} });
