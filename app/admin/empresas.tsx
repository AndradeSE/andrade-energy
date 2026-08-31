import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { atualizarEmpresa, criarEmpresa, IdentidadeEmpresa, listarEmpresas, NovaEmpresa } from "../../services/empresas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const inicial: NovaEmpresa = { nome: "", slug: "", documento: "", emailSuporte: "", telefoneSuporte: "", dominio: "", logoUrl: "", corPrimaria: "#087A46", corSecundaria: "#F7D75C", identidadePersonalizada: true };

export default function EmpresasAdmin() {
  const { usuario } = useAuth();
  const [empresas, setEmpresas] = useState<IdentidadeEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<IdentidadeEmpresa | null>(null);
  const [form, setForm] = useState<NovaEmpresa>(inicial);
  const carregar = useCallback(async () => {
    setLoading(true);
    try { setEmpresas(await listarEmpresas()); }
    catch (error: any) { Alert.alert("Empresas", error?.response?.data?.message ?? "Não foi possível carregar as empresas."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (usuario && usuario.perfil !== "ADMIN") router.replace("/");
  }, [usuario]);
  if (!usuario || usuario.perfil !== "ADMIN") return null;
  const alterar = (campo: keyof NovaEmpresa, valor: any) => setForm((atual) => ({ ...atual, [campo]: valor }));
  function abrirEdicao(empresa: IdentidadeEmpresa) {
    setEditando(empresa);
    setForm({ nome: empresa.nome, slug: empresa.slug, razaoSocial: empresa.razao_social ?? "", documento: empresa.documento ?? "", emailSuporte: empresa.email_suporte ?? "", telefoneSuporte: empresa.telefone_suporte ?? "", dominio: empresa.dominio ?? "", logoUrl: empresa.logo_url ?? "", corPrimaria: empresa.cor_primaria, corSecundaria: empresa.cor_secundaria, identidadePersonalizada: empresa.identidade_personalizada });
    setAberto(true);
  }
  function fechar() { setAberto(false); setEditando(null); setForm(inicial); }
  async function salvar() {
    if (!form.nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome da empresa.");
    setSalvando(true);
    try { if (editando) await atualizarEmpresa(editando.id, { ...form, ativo: editando.ativo !== false }); else await criarEmpresa(form); fechar(); await carregar(); Alert.alert(editando ? "Empresa atualizada" : "Empresa criada", editando ? "A identidade foi atualizada." : "A empresa já pode receber usuários, usinas, clientes e faturas isolados."); }
    catch (error: any) { Alert.alert("Não foi possível criar", error?.response?.data?.message ?? error?.message); }
    finally { setSalvando(false); }
  }
  return <Screen>
    <AppHeader variant="subpage" title="Empresas" subtitle="Ecossistema multiempresa" contextTitle="Empresas parceiras" contextSubtitle="Identidade e dados isolados" icon="layers-outline" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} colors={[Colors.primary]} />}>
      <View style={styles.intro}><View style={styles.introCopy}><Text style={styles.eyebrow}>ADMINISTRAÇÃO MULTIEMPRESA</Text><Text style={styles.title}>{empresas.length} {empresas.length === 1 ? "empresa no ecossistema" : "empresas no ecossistema"}</Text></View><TouchableOpacity onPress={() => setAberto(true)} style={styles.add}><Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addText}>Nova empresa</Text></TouchableOpacity></View>
      <Text style={styles.help}>Cada empresa possui identidade, usuários e operação separados. Andrade Energy permanece como ambiente padrão e proprietário.</Text>
      {loading && !empresas.length ? <View style={styles.loading}><ActivityIndicator color={Colors.primary} /><Text style={styles.loadingText}>Carregando empresas...</Text></View> : null}
      {!loading && !empresas.length ? <Card style={styles.empty}><Ionicons name="business-outline" size={30} color={Colors.primary} /><Text style={styles.emptyTitle}>Nenhuma empresa parceira</Text><Text style={styles.emptyText}>Cadastre a primeira empresa para separar identidade, usuários e operação.</Text></Card> : null}
      {empresas.map((empresa) => <TouchableOpacity key={empresa.id} activeOpacity={0.82} onPress={() => abrirEdicao(empresa)}><Card style={styles.card}>
        <View style={styles.cardTop}>
          {empresa.logo_url ? <Image source={{ uri: empresa.logo_url }} resizeMode="contain" style={styles.brandImage} /> : <View style={[styles.brand, { backgroundColor: empresa.cor_primaria || Colors.primary }]}><Text style={styles.brandText}>{empresa.nome.slice(0, 2).toUpperCase()}</Text></View>}
          <View style={styles.copy}><Text numberOfLines={2} style={styles.name}>{empresa.nome}</Text><Text numberOfLines={2} style={styles.meta}>{empresa.empresa_proprietaria ? "Empresa proprietária · ambiente padrão" : empresa.identidade_personalizada ? "Identidade própria ativa" : "Identidade Andrade Energy"}</Text></View>
          <View style={[styles.status, empresa.ativo === false && styles.statusInactive]}><View style={[styles.statusDot, empresa.ativo === false && styles.statusDotInactive]} /><Text style={[styles.statusText, empresa.ativo === false && styles.statusTextInactive]}>{empresa.ativo === false ? "Inativa" : "Ativa"}</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardBottom}><View style={styles.colors}><View style={[styles.dot, { backgroundColor: empresa.cor_primaria || Colors.primary }]} /><View style={[styles.dot, { backgroundColor: empresa.cor_secundaria || Colors.secondary }]} /><Text numberOfLines={1} style={styles.slug}>{empresa.slug}</Text></View><View style={styles.editHint}><Text style={styles.editText}>Ver e editar</Text><Ionicons name="chevron-forward" size={16} color={Colors.primary} /></View></View>
      </Card></TouchableOpacity>)}
    </ScrollView>
    <Modal animationType="slide" transparent visible={aberto} onRequestClose={fechar}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHeader}><View style={styles.modalTitleCopy}><Text style={styles.modalEyebrow}>{editando ? "EMPRESA PARCEIRA" : "NOVA PARCERIA"}</Text><Text style={styles.modalTitle}>{editando ? "Editar empresa" : "Nova empresa"}</Text></View><TouchableOpacity accessibilityLabel="Fechar" hitSlop={12} onPress={fechar} style={styles.close}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>{([['nome','Nome da empresa'],['razaoSocial','Razão social'],['slug','Identificador (slug)'],['documento','CNPJ/CPF'],['emailSuporte','E-mail de suporte'],['telefoneSuporte','Telefone de suporte'],['dominio','Domínio'],['logoUrl','URL da logo'],['corPrimaria','Cor principal'],['corSecundaria','Cor secundária']] as [keyof NovaEmpresa,string][]).map(([campo,label]) => <View key={campo}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize={campo === 'nome' || campo === 'razaoSocial' ? 'words' : 'none'} autoCorrect={false} onChangeText={(v) => alterar(campo,v)} placeholder={label} placeholderTextColor={Colors.subtitle} style={styles.input} value={String(form[campo] ?? '')} /></View>)}
        <View style={styles.switchRow}><View style={styles.copy}><Text style={styles.name}>Identidade própria</Text><Text style={styles.meta}>Usar logo e cores desta empresa no app.</Text></View><Switch value={Boolean(form.identidadePersonalizada)} onValueChange={(v) => alterar('identidadePersonalizada',v)} /></View>
        {editando && !editando.empresa_proprietaria ? <View style={styles.switchRow}><View style={styles.copy}><Text style={styles.name}>Empresa ativa</Text><Text style={styles.meta}>Permite que os usuários acessem esta operação.</Text></View><Switch value={editando.ativo !== false} onValueChange={(v) => setEditando((atual) => atual ? { ...atual, ativo: v } : atual)} /></View> : null}
        <TouchableOpacity disabled={salvando} onPress={salvar} style={styles.save}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editando ? "Salvar alterações" : "Criar empresa"}</Text>}</TouchableOpacity>
      </ScrollView></View></KeyboardAvoidingView></Modal>
  </Screen>;
}

const styles = StyleSheet.create({ content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},intro:{gap:Spacing.md},introCopy:{minWidth:0},eyebrow:{color:Colors.primary,fontSize:10,fontWeight:'900',letterSpacing:1},title:{marginTop:4,color:Colors.text,fontSize:Typography.title,fontWeight:'900'},help:{marginVertical:Spacing.md,color:Colors.subtitle,lineHeight:19},add:{alignSelf:'flex-start',minHeight:42,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:Spacing.md,borderRadius:Radius.round,backgroundColor:Colors.primary},addText:{color:'#FFF',fontWeight:'900'},loading:{alignItems:'center',gap:8,paddingVertical:Spacing.xl},loadingText:{color:Colors.subtitle,fontSize:12},empty:{alignItems:'center',paddingVertical:Spacing.xl},emptyTitle:{marginTop:Spacing.sm,color:Colors.text,fontWeight:'900'},emptyText:{marginTop:5,maxWidth:280,color:Colors.subtitle,textAlign:'center',lineHeight:18},card:{marginBottom:Spacing.sm,padding:Spacing.md},cardTop:{flexDirection:'row',alignItems:'center'},brand:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:Radius.md},brandImage:{width:48,height:48,borderRadius:Radius.md,backgroundColor:'#FFF'},brandText:{color:'#FFF',fontWeight:'900'},copy:{flex:1,minWidth:0,marginHorizontal:Spacing.sm},name:{color:Colors.text,fontWeight:'800'},meta:{marginTop:3,color:Colors.subtitle,fontSize:11,lineHeight:15},status:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:5,borderRadius:Radius.round,backgroundColor:'#E5F5EC'},statusInactive:{backgroundColor:'#F1F3F4'},statusDot:{width:7,height:7,borderRadius:4,backgroundColor:Colors.success},statusDotInactive:{backgroundColor:Colors.subtitle},statusText:{color:Colors.success,fontSize:10,fontWeight:'900'},statusTextInactive:{color:Colors.subtitle},divider:{height:1,marginVertical:Spacing.sm,backgroundColor:Colors.border},cardBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:Spacing.sm},colors:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:5},dot:{width:12,height:12,borderRadius:6},slug:{flex:1,marginLeft:3,color:Colors.subtitle,fontSize:10},editHint:{flexDirection:'row',alignItems:'center'},editText:{color:Colors.primary,fontSize:11,fontWeight:'800'},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(15,23,42,.45)'},modal:{maxHeight:'94%',borderTopLeftRadius:Radius.xl,borderTopRightRadius:Radius.xl,backgroundColor:Colors.surface,overflow:'hidden'},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:Spacing.lg,borderBottomWidth:1,borderBottomColor:Colors.border},modalTitleCopy:{flex:1,minWidth:0},modalEyebrow:{color:Colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},modalTitle:{marginTop:3,color:Colors.text,fontSize:Typography.title,fontWeight:'900'},close:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:20,backgroundColor:Colors.background},form:{padding:Spacing.lg,paddingBottom:Spacing.xxl},label:{marginTop:Spacing.sm,marginBottom:5,color:Colors.text,fontSize:11,fontWeight:'800'},input:{minHeight:48,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,color:Colors.text,backgroundColor:Colors.background},switchRow:{flexDirection:'row',alignItems:'center',marginTop:Spacing.lg},save:{minHeight:52,alignItems:'center',justifyContent:'center',marginTop:Spacing.lg,borderRadius:Radius.round,backgroundColor:Colors.primary},saveText:{color:'#FFF',fontWeight:'900'} });
