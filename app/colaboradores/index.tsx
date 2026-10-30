import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Switch } from "../../components/assistant/AssistantNativeControls";
import { TextInput, TouchableOpacity } from "../../components/assistant/AssistantNativeControls";
import { AppHeader, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { atualizarColaborador, cancelarConviteColaborador, convidarColaborador, listarColaboradores, reenviarConviteColaborador, promoverColaboradorAdministrador, revogarAdministradorColaborador } from "../../services/colaboradores.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { juntarNomePessoa, nomePessoaValido } from "../../utils/nomePessoa";
import { COMMERCIAL_PERMISSION_LABELS, commercialPermission } from "../../config/commercialPermissions";

const GERADOR = { usinas: "Usinas", clientes: "Clientes", unidades: "Unidades consumidoras", contratos: "Contratos", faturas: "Faturas", operacao: "Operação" };
const COMERCIAL = COMMERCIAL_PERMISSION_LABELS;

export default function Colaboradores({ modoAbaGerador = false, modoConvite = false }: { modoAbaGerador?: boolean; modoConvite?: boolean }) {
  const { user } = useAuth();
  const convidado = String(user?.papel_empresa ?? "").startsWith("COLABORADOR_");
  const { ambiente } = useLocalSearchParams<{ ambiente?: string }>();
  const admin = user?.perfil === "ADMIN";
  const comercial = !modoAbaGerador && (ambiente === "comercial" || (admin && ambiente !== "gerador"));
  const papel = comercial ? "COLABORADOR_COMERCIAL" : "COLABORADOR_GERADOR";
  const campos = papel === "COLABORADOR_COMERCIAL" ? COMERCIAL : GERADOR;
  const [nome, setNome] = useState(""); const [sobrenome, setSobrenome] = useState(""); const [cpf, setCpf] = useState(""); const [email, setEmail] = useState(""); const [telefone, setTelefone] = useState("");
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({});
  const [dados, setDados] = useState<any>({ colaboradores: [], convites: [] });
  const [carregando, setCarregando] = useState(true); const [enviando, setEnviando] = useState(false);
  const carregar = useCallback(async () => { try { setDados(await listarColaboradores()); } catch (e: any) { Alert.alert("Colaboradores", e?.response?.data?.message ?? "Não foi possível carregar."); } finally { setCarregando(false); } }, []);
  useFocusEffect(useCallback(() => { if (!convidado && !modoConvite) void carregar(); }, [carregar, convidado, modoConvite]));
  useEffect(() => { setPermissoes(Object.fromEntries(Object.keys(campos).map((chave) => [chave, papel === "COLABORADOR_COMERCIAL" ? commercialPermission({}, chave) : true]))); }, [papel]);
  const lista = useMemo(() => [...(dados.colaboradores ?? []).map((item: any) => ({ ...item, pendente: false })), ...(dados.convites ?? []).map((item: any) => ({ ...item, pendente: true }))], [dados]);

  async function enviar() {
    if (convidado) return;
    if (!nomePessoaValido(nome, sobrenome)) return Alert.alert("Nome completo obrigatório", "Informe nome e sobrenome válidos do colaborador.");
    try {
      setEnviando(true);
      const resultado = await convidarColaborador({ nome: juntarNomePessoa(nome, sobrenome), cpf, email, telefone, papel, permissoes });
      setNome(""); setSobrenome(""); setCpf(""); setEmail(""); setTelefone("");
      Alert.alert("Convite criado", resultado.emailEnviado ? "O convite foi enviado por e-mail." : `O e-mail não foi entregue. Compartilhe este código:\n\n${resultado.token ?? ""}`, [{ text: "Voltar para equipe", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Não foi possível convidar", e?.response?.data?.message ?? "Confira os dados."); } finally { setEnviando(false); }
  }

  if (convidado) return <Redirect href={user?.papel_empresa === "COLABORADOR_COMERCIAL" ? "/admin/comercial" : "/"} />;

  return <Screen edges={["top", "left", "right"]}>
    <AppHeader variant={modoAbaGerador ? "main" : "subpage"} title={modoConvite ? "Convidar colaborador" : "Colaboradores"} subtitle="Equipe e permissões" contextTitle="Gestão de acessos" contextSubtitle="Convites e acessos operacionais" icon="people-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!modoAbaGerador ? <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.primary}/><Text style={styles.backText}>Voltar</Text></TouchableOpacity> : null}
      {modoConvite ? <>
      <Text style={styles.title}>{comercial ? "Convidar para a equipe comercial" : "Convidar para a equipe do gerador"}</Text>
      <Text style={styles.subtitle}>{comercial ? "Escolha as funções que esta pessoa poderá executar. Carteira, transferências e gestão da equipe ficam bloqueadas." : "Este acesso pertence somente a esta operação geradora. Carteira, recebíveis, transferências e ferramentas do titular continuam bloqueados."}</Text>
      <Card style={styles.form}>
        <Field label="Nome *" value={nome} onChangeText={setNome}/><Field label="Sobrenome *" value={sobrenome} onChangeText={setSobrenome}/><Field label="CPF" value={cpf} onChangeText={(v: string) => setCpf(v.replace(/\D/g, "").slice(0, 11))} keyboardType="numeric"/><Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/><Field label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad"/>
        <Text style={styles.permissionTitle}>PERMISSÕES OPERACIONAIS</Text>
        <Permissoes campos={campos} valores={permissoes} comercial={comercial} onChange={(chave, valor) => setPermissoes(atual => ({ ...atual, [chave]: valor }))} />
        <TouchableOpacity disabled={enviando} onPress={() => void enviar()} style={[styles.primary, enviando && styles.disabled]}>{enviando ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>Enviar convite</Text>}</TouchableOpacity>
      </Card>
      </> : <>
      <Text style={styles.title}>Sua equipe</Text>
      <Text style={styles.subtitle}>Gerencie os acessos e acompanhe os convites enviados.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/colaboradores/convidar", params: { ambiente: comercial ? "comercial" : "gerador" } } as any)} style={styles.primary}><Text style={styles.primaryText}>+ Convidar colaborador</Text></TouchableOpacity>
      <Text style={[styles.title, styles.teamTitle]}>Equipe e convites</Text>
      {(dados.administradores ?? []).map((item: any) => <AdministradorPromovido key={item.id} item={item} onChange={carregar}/>)}
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/colaboradores/atividade", params: { ambiente: modoAbaGerador ? "gerador" : ambiente ?? (admin ? "comercial" : "gerador") } } as any)}
        style={styles.auditButton}
      >
        <Ionicons name="time-outline" size={18} color={Colors.primary} />
        <Text style={styles.auditLink}>Ver atividades dos colaboradores</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
      </TouchableOpacity>
      {carregando ? <Loading /> : lista.length ? lista.map((item: any) => <Member key={`${item.pendente}-${item.id}`} item={item} onChange={carregar} promocoes={dados.promocoesPermitidas ?? []}/>) : <Card><Text style={styles.empty}>Nenhum colaborador ou convite cadastrado.</Text></Card>}
      </>}
    </ScrollView>
  </Screen>;
}

function AdministradorPromovido({ item, onChange }: any) {
  const [salvando, setSalvando] = useState(false);
  const pessoa = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
  const revogar = () => Alert.alert("Remover acesso de administrador?", `${pessoa?.nome ?? "Esta pessoa"} voltará a ser colaborador, sem permissões operacionais até você configurá-las. O acesso ao financeiro será removido e as sessões abertas serão encerradas.`, [
    { text: "Cancelar", style: "cancel" },
    { text: "Remover acesso ADM", style: "destructive", onPress: () => {
      setSalvando(true);
      void revogarAdministradorColaborador(item.id).then(async () => {
        await onChange();
        Alert.alert("Acesso ADM removido", "Configure agora as permissões de colaborador. A pessoa precisa entrar novamente.");
      }).catch((erro: any) => Alert.alert("Não foi possível remover o acesso", erro?.response?.data?.message ?? "Tente novamente."))
        .finally(() => setSalvando(false));
    } },
  ]);
  return <Card style={styles.member}><Text style={styles.memberName}>{pessoa?.nome ?? "Administrador"}</Text><Text style={styles.memberEmail}>{pessoa?.email}</Text><Text style={styles.role}>Administrador · acesso completo, inclusive financeiro</Text>{item.podeRevogar ? <TouchableOpacity accessibilityRole="button" disabled={salvando} onPress={revogar} style={styles.auditButton}><Text style={styles.actionDanger}>{salvando ? "Removendo…" : "Remover acesso ADM"}</Text></TouchableOpacity> : null}</Card>;
}

function Member({ item, onChange, promocoes = [] }: any) {
  const [expandido, setExpandido] = useState(false);
  const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
  const nome = item.nome ?? usuario?.nome ?? "Colaborador"; const email = item.email ?? usuario?.email ?? "";
  const ativo = item.pendente ? item.status === "PENDENTE" : item.ativo;
  async function executar(acao: () => Promise<any>, sucesso: string) { try { const resposta = await acao(); await onChange(); Alert.alert(sucesso, resposta?.token ? `Compartilhe o código:\n\n${resposta.token}` : "Operação concluída."); } catch (e: any) { Alert.alert("Colaboradores", e?.response?.data?.message ?? "Não foi possível concluir."); } }
  const opcoes = item.papel === "COLABORADOR_COMERCIAL" ? COMERCIAL : GERADOR;
  return <Card style={styles.member}><View style={styles.memberTop}><View style={styles.avatar}><Text style={styles.avatarText}>{nome.charAt(0).toUpperCase()}</Text></View><View style={styles.grow}><Text style={styles.memberName}>{nome}</Text><Text style={styles.memberEmail}>{email}</Text></View><Text style={[styles.badge, ativo && styles.badgeActive]}>{item.pendente ? item.status : ativo ? "ATIVO" : "BLOQUEADO"}</Text></View><Text style={styles.role}>{item.papel === "COLABORADOR_COMERCIAL" ? "Equipe comercial" : "Equipe do gerador"}</Text>{!item.pendente ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expandido }} onPress={() => setExpandido(v => !v)} style={styles.auditButton}><Text style={styles.auditLink}>{expandido ? "Ocultar permissões" : "Gerenciar permissões"}</Text><Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={18} color={Colors.primary}/></TouchableOpacity> : null}{!item.pendente && expandido ? <Permissoes campos={opcoes} valores={item.permissoes} comercial={item.papel === "COLABORADOR_COMERCIAL"} disabled={!ativo} onChange={(chave,valor) => void executar(() => atualizarColaborador(item.id,{permissoes:{...item.permissoes,[chave]:valor}}),"Permissões atualizadas")} /> : null}<PromoverAdministrador item={item} nome={nome} opcoes={promocoes} onChange={onChange}/><View style={styles.actions}>{item.pendente ? <><TouchableOpacity onPress={() => void executar(() => reenviarConviteColaborador(item.id), "Convite reenviado")}><Text style={styles.action}>Reenviar</Text></TouchableOpacity><TouchableOpacity onPress={() => void executar(() => cancelarConviteColaborador(item.id), "Convite cancelado")}><Text style={styles.actionDanger}>Cancelar</Text></TouchableOpacity></> : <TouchableOpacity onPress={() => void executar(() => atualizarColaborador(item.id, { ativo: !ativo }), ativo ? "Acesso bloqueado" : "Acesso reativado")}><Text style={ativo ? styles.actionDanger : styles.action}>{ativo ? "Bloquear acesso" : "Reativar acesso"}</Text></TouchableOpacity>}</View></Card>;
}

function PromoverAdministrador({ item, nome, opcoes, onChange }: any) {
  const [salvando, setSalvando] = useState(false);
  if (item.pendente || !item.ativo || !opcoes.length) return null;
  const confirmar = (escopo: string) => {

    Alert.alert(`Promover ${nome}?`, "Conceder acesso completo de ADM ao Comercial, empresa/usinas, equipe e financeiro, respeitando os limites da empresa. A pessoa precisará entrar novamente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar promoção", onPress: () => {
        setSalvando(true);
        void promoverColaboradorAdministrador(item.id, escopo).then(async () => {
          await onChange();
          Alert.alert("Acesso administrativo concedido", "A conta deixou de ser colaborador. A pessoa precisa entrar novamente para acessar as novas funções.");
        }).catch((erro: any) => Alert.alert("Não foi possível promover", erro?.response?.data?.message ?? "Tente novamente."))
          .finally(() => setSalvando(false));
      } },
    ]);
  };
  return <TouchableOpacity disabled={salvando} accessibilityRole="button" onPress={() => confirmar("COMPLETO")} style={[styles.primary, salvando && styles.disabled]}><Text style={styles.primaryText}>{salvando ? "Promovendo…" : "Tornar administrador"}</Text></TouchableOpacity>;
}
function Permissoes({ campos, valores, comercial, disabled = false, onChange }: { campos: Record<string,string>; valores: Record<string,boolean>; comercial: boolean; disabled?: boolean; onChange: (chave:string,valor:boolean)=>void }) {
  const [comercialAberto,setComercialAberto] = useState(true);
  const [geradorAberto,setGeradorAberto] = useState(true);
  const entradas = Object.entries(campos);
  const linhas = (itens: [string,string][]) => itens.map(([chave,label]) => <View key={chave} style={[styles.permission,{marginLeft:14,paddingLeft:12,borderLeftWidth:2,borderLeftColor:Colors.border},disabled && {opacity:.5}]}><Text style={styles.permissionText}>{label}</Text><Switch accessibilityLabel={label} disabled={disabled} value={comercial ? commercialPermission(valores,chave) : valores?.[chave] !== false} onValueChange={valor=>onChange(chave,valor)} trackColor={{false:Colors.border,true:Colors.primary}} /></View>);
  if (!comercial) return <><TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:geradorAberto}} onPress={()=>setGeradorAberto(v=>!v)} style={styles.auditButton}><Text style={styles.auditLink}>Ambiente Gerador</Text><Ionicons name={geradorAberto ? "chevron-up" : "chevron-down"} size={18} color={Colors.primary}/></TouchableOpacity>{geradorAberto ? linhas(entradas) : null}</>;
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:comercialAberto}} onPress={()=>setComercialAberto(v=>!v)} style={styles.auditButton}><Ionicons name="briefcase-outline" size={20} color={Colors.primary}/><Text style={styles.auditLink}>Ambiente Comercial</Text><Ionicons name={comercialAberto ? "chevron-up" : "chevron-down"} size={18} color={Colors.primary}/></TouchableOpacity>
    {comercialAberto ? linhas(entradas.filter(([chave])=>chave !== "ambientes_gerador" && !chave.startsWith("gerador_"))) : null}
    <View style={[styles.permission,{marginTop:18,paddingHorizontal:12,borderWidth:1,borderColor:Colors.border,borderRadius:12,backgroundColor:Colors.primaryLight}]}><Ionicons name="sunny-outline" size={20} color={Colors.primary}/><Text style={[styles.permissionText,{paddingLeft:10}]}>Ambiente Gerador</Text><Switch accessibilityLabel="Ativar Ambiente Gerador" disabled={disabled} value={commercialPermission(valores,"ambientes_gerador")} onValueChange={valor=>onChange("ambientes_gerador",valor)} trackColor={{false:Colors.border,true:Colors.primary}} /></View>
    {valores?.ambientes_gerador === true ? linhas(entradas.filter(([chave])=>chave.startsWith("gerador_"))) : null}
  </>;
}
function Field(props: any) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input}/></View>; }
const styles = StyleSheet.create({ content:{padding:Spacing.lg,paddingBottom:Spacing.xxl*3},back:{flexDirection:"row",alignItems:"center",gap:6,marginBottom:Spacing.md},backText:{color:Colors.primary,fontWeight:"800"},title:{marginTop:Spacing.sm,color:Colors.text,fontSize:Typography.title,fontWeight:"900"},teamTitle:{marginBottom:Spacing.sm},auditButton:{minHeight:48,flexDirection:"row",alignItems:"center",gap:8,marginBottom:Spacing.md,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:"#C9DED1",borderRadius:Radius.md,backgroundColor:"#F4FAF6"},auditLink:{flex:1,color:Colors.primary,fontSize:12,fontWeight:"900"},subtitle:{marginTop:6,marginBottom:Spacing.md,color:Colors.subtitle,lineHeight:20},types:{flexDirection:"row",gap:8,marginBottom:Spacing.md},type:{flex:1,padding:12,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.round,alignItems:"center"},typeActive:{borderColor:Colors.primary,backgroundColor:Colors.primaryLight},typeText:{color:Colors.subtitle,fontSize:12,fontWeight:"800"},typeTextActive:{color:Colors.primary},form:{marginBottom:Spacing.xl},field:{marginBottom:Spacing.sm},label:{marginBottom:5,color:Colors.text,fontSize:12,fontWeight:"800"},input:{minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,color:Colors.text,backgroundColor:Colors.surface},permissionTitle:{marginTop:Spacing.md,marginBottom:4,color:Colors.subtitle,fontSize:10,fontWeight:"900",letterSpacing:.8},permission:{minHeight:46,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:Colors.border},permissionText:{flex:1,paddingRight:12,color:Colors.text,fontWeight:"700"},primary:{minHeight:52,alignItems:"center",justifyContent:"center",marginTop:Spacing.md,borderRadius:Radius.md,backgroundColor:Colors.primary},primaryText:{color:"#FFF",fontWeight:"900"},disabled:{opacity:.6},empty:{color:Colors.subtitle,textAlign:"center"},member:{marginTop:0},memberTop:{flexDirection:"row",alignItems:"center",gap:10},avatar:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",backgroundColor:Colors.primaryLight},avatarText:{color:Colors.primary,fontWeight:"900"},grow:{flex:1},memberName:{color:Colors.text,fontWeight:"900"},memberEmail:{marginTop:2,color:Colors.subtitle,fontSize:12},badge:{paddingHorizontal:8,paddingVertical:4,borderRadius:999,backgroundColor:"#FEE2E2",color:"#991B1B",fontSize:9,fontWeight:"900"},badgeActive:{backgroundColor:"#DCFCE7",color:"#166534"},role:{marginTop:10,color:Colors.subtitle,fontSize:12,fontWeight:"700"},memberPermission:{minHeight:40,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:4},memberPermissionText:{flex:1,paddingRight:12,color:Colors.text,fontSize:12,fontWeight:"700"},actions:{flexDirection:"row",gap:20,marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:Colors.border},action:{color:Colors.primary,fontWeight:"900"},actionDanger:{color:Colors.danger,fontWeight:"900"} });
