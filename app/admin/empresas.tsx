import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, RefreshControl, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

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
  if (usuario?.perfil !== "ADMIN") { router.replace("/"); return null; }
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
    try { if (editando) await atualizarEmpresa(editando.id, form); else await criarEmpresa(form); fechar(); await carregar(); Alert.alert(editando ? "Empresa atualizada" : "Empresa criada", editando ? "A identidade foi atualizada." : "A empresa já pode receber usuários, usinas, clientes e faturas isolados."); }
    catch (error: any) { Alert.alert("Não foi possível criar", error?.response?.data?.message ?? error?.message); }
    finally { setSalvando(false); }
  }
  return <Screen>
    <AppHeader variant="subpage" title="Empresas" subtitle="Ecossistema multiempresa" contextTitle="Empresas parceiras" contextSubtitle="Identidade e dados isolados" icon="layers-outline" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} colors={[Colors.primary]} />}>
      <View style={styles.intro}><View><Text style={styles.eyebrow}>ADMINISTRAÇÃO MULTIEMPRESA</Text><Text style={styles.title}>{empresas.length} empresas no ecossistema</Text></View><TouchableOpacity onPress={() => setAberto(true)} style={styles.add}><Ionicons name="add" size={22} color="#FFF" /><Text style={styles.addText}>Nova</Text></TouchableOpacity></View>
      <Text style={styles.help}>Cada empresa possui identidade, usuários e operação separados. Andrade Energy permanece como ambiente padrão e proprietário.</Text>
      {loading && !empresas.length ? <ActivityIndicator color={Colors.primary} /> : empresas.map((empresa) => <TouchableOpacity key={empresa.id} activeOpacity={0.82} onPress={() => abrirEdicao(empresa)}><Card style={styles.card}>
        <View style={[styles.brand, { backgroundColor: empresa.cor_primaria }]}><Text style={styles.brandText}>{empresa.nome.slice(0, 2).toUpperCase()}</Text></View>
        <View style={styles.copy}><Text style={styles.name}>{empresa.nome}</Text><Text style={styles.meta}>{empresa.empresa_proprietaria ? "Empresa proprietária · padrão" : empresa.identidade_personalizada ? "Identidade personalizada" : "Identidade Andrade Energy"}</Text><View style={styles.colors}><View style={[styles.dot, { backgroundColor: empresa.cor_primaria }]} /><View style={[styles.dot, { backgroundColor: empresa.cor_secundaria }]} /><Text style={styles.slug}>{empresa.slug}</Text></View></View>
        <Ionicons name="checkmark-circle" size={20} color={empresa.empresa_proprietaria ? Colors.secondary : Colors.success} />
      </Card></TouchableOpacity>)}
    </ScrollView>
    <Modal animationType="slide" transparent visible={aberto} onRequestClose={fechar}><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editando ? "Editar empresa" : "Nova empresa"}</Text><TouchableOpacity onPress={fechar}><Ionicons name="close" size={26} color={Colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.form}>{([['nome','Nome da empresa'],['slug','Identificador (slug)'],['documento','CNPJ/CPF'],['emailSuporte','E-mail de suporte'],['telefoneSuporte','Telefone de suporte'],['dominio','Domínio'],['logoUrl','URL da logo'],['corPrimaria','Cor principal'],['corSecundaria','Cor secundária']] as [keyof NovaEmpresa,string][]).map(([campo,label]) => <View key={campo}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize={campo === 'nome' ? 'words' : 'none'} onChangeText={(v) => alterar(campo,v)} placeholder={label} placeholderTextColor={Colors.subtitle} style={styles.input} value={String(form[campo] ?? '')} /></View>)}
        <View style={styles.switchRow}><View style={styles.copy}><Text style={styles.name}>Identidade própria</Text><Text style={styles.meta}>Usar logo e cores desta empresa no app.</Text></View><Switch value={Boolean(form.identidadePersonalizada)} onValueChange={(v) => alterar('identidadePersonalizada',v)} /></View>
        <TouchableOpacity disabled={salvando} onPress={salvar} style={styles.save}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editando ? "Salvar alterações" : "Criar empresa"}</Text>}</TouchableOpacity>
      </ScrollView></View></View></Modal>
  </Screen>;
}

const styles = StyleSheet.create({ content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},intro:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},eyebrow:{color:Colors.primary,fontSize:10,fontWeight:'900',letterSpacing:1},title:{marginTop:4,color:Colors.text,fontSize:Typography.title,fontWeight:'900'},help:{marginVertical:Spacing.md,color:Colors.subtitle,lineHeight:19},add:{minHeight:42,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:Spacing.md,borderRadius:Radius.round,backgroundColor:Colors.primary},addText:{color:'#FFF',fontWeight:'900'},card:{flexDirection:'row',alignItems:'center',marginBottom:Spacing.sm},brand:{width:46,height:46,alignItems:'center',justifyContent:'center',borderRadius:Radius.md},brandText:{color:'#FFF',fontWeight:'900'},copy:{flex:1,minWidth:0,marginHorizontal:Spacing.sm},name:{color:Colors.text,fontWeight:'800'},meta:{marginTop:3,color:Colors.subtitle,fontSize:11},colors:{flexDirection:'row',alignItems:'center',gap:5,marginTop:7},dot:{width:12,height:12,borderRadius:6},slug:{marginLeft:3,color:Colors.subtitle,fontSize:10},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(15,23,42,.45)'},modal:{maxHeight:'92%',borderTopLeftRadius:Radius.xl,borderTopRightRadius:Radius.xl,backgroundColor:Colors.surface},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:Spacing.lg,borderBottomWidth:1,borderBottomColor:Colors.border},modalTitle:{color:Colors.text,fontSize:Typography.title,fontWeight:'900'},form:{padding:Spacing.lg,paddingBottom:Spacing.xxl},label:{marginTop:Spacing.sm,marginBottom:5,color:Colors.text,fontSize:11,fontWeight:'800'},input:{minHeight:48,paddingHorizontal:Spacing.md,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,color:Colors.text,backgroundColor:Colors.background},switchRow:{flexDirection:'row',alignItems:'center',marginTop:Spacing.lg},save:{minHeight:52,alignItems:'center',justifyContent:'center',marginTop:Spacing.lg,borderRadius:Radius.round,backgroundColor:Colors.primary},saveText:{color:'#FFF',fontWeight:'900'} });
