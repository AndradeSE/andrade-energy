import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import {
  alterarMinhaSenha,
  atualizarMeuPerfil,
  excluirMinhaConta,
  me,
  PerfilUsuario,
} from "../../services/auth.service";
import {
  ativarDigital,
  autenticarComDigital,
  desativarDigital,
  verificarDigitalDisponivel,
} from "../../services/biometric.service";
import { AppHeader, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

function formatarCpf(valor?: string | null) {
  const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos ? `(${digitos}` : "";
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function descricaoErro(erro: any, alternativa: string) {
  return erro?.response?.data?.message ?? erro?.message ?? alternativa;
}

export default function Perfil() {
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  const { user, digitalEnabled, atualizarUsuario, refreshDigitalStatus, signOut } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [telefone, setTelefone] = useState(formatarTelefone(user?.telefone ?? ""));
  const [cpf, setCpf] = useState(user?.cpf ?? "");
  const [digitalDisponivel, setDigitalDisponivel] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoDigital, setSalvandoDigital] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [mostrarExclusao, setMostrarExclusao] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState("");

  const chaveFoto = `foto-perfil:${user?.id ?? "usuario"}`;

  useEffect(() => { void AsyncStorage.getItem(chaveFoto).then((valor) => setFotoPerfil(valor ?? "")); }, [chaveFoto]);

  async function alterarFoto() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
    if (resultado.canceled || !resultado.assets?.[0]?.uri) return;
    try {
      const extensao = resultado.assets[0].name?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const destino = `${FileSystem.documentDirectory}perfil-${user?.id ?? "usuario"}.${extensao}`;
      await FileSystem.copyAsync({ from: resultado.assets[0].uri, to: destino });
      await AsyncStorage.setItem(chaveFoto, destino);
      setFotoPerfil(destino);
    } catch { Alert.alert("Não foi possível alterar a foto", "Escolha outra imagem e tente novamente."); }
  }

  const preencherUsuario = useCallback((dados: Partial<PerfilUsuario>) => {
    setNome(dados.nome ?? "");
    setEmail(dados.email ?? "");
    setTelefone(formatarTelefone(dados.telefone ?? ""));
    setCpf(dados.cpf ?? "");
  }, []);

  const carregar = useCallback(async () => {
    const disponibilidade = verificarDigitalDisponivel();
    try {
      const dados = await me();
      preencherUsuario(dados);
      await atualizarUsuario({ ...dados, cpf: dados.cpf ?? undefined, telefone: dados.telefone ?? undefined });
    } catch {
      // Mantemos os dados locais se a conexão estiver indisponível.
    }
    setDigitalDisponivel(await disponibilidade);
  }, [atualizarUsuario, preencherUsuario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(useCallback(() => {
    if (!IS_GERADOR_APP || user?.perfil !== "ADMIN" || origem !== "comercial") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/admin/comercial" as any);
      return true;
    });
    return () => subscription.remove();
  }, [origem, user?.perfil]));

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar();
      await refreshDigitalStatus();
    } finally {
      setAtualizando(false);
    }
  }

  async function salvarDados() {
    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim().toLowerCase();
    if (!nomeNormalizado) {
      Alert.alert("Informe seu nome", "Preencha o nome completo para salvar as alterações.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      Alert.alert("E-mail inválido", "Informe um e-mail válido.");
      return;
    }

    try {
      setSalvando(true);
      const perfilAtualizado = await atualizarMeuPerfil({
        nome: nomeNormalizado,
        email: emailNormalizado,
        telefone: telefone.replace(/\D/g, "") || null,
      });
      preencherUsuario(perfilAtualizado);
      await atualizarUsuario({ ...perfilAtualizado, cpf: perfilAtualizado.cpf ?? undefined, telefone: perfilAtualizado.telefone ?? undefined });
      Alert.alert("Dados atualizados", "Suas informações foram salvas.");
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", descricaoErro(erro, "Tente novamente em alguns instantes."));
    } finally {
      setSalvando(false);
    }
  }

  async function alterarDigital(ativar: boolean) {
    if (salvandoDigital || !user?.id) return;
    try {
      setSalvandoDigital(true);
      const disponivel = await verificarDigitalDisponivel();
      setDigitalDisponivel(disponivel);
      if (!disponivel) {
        Alert.alert("Biometria indisponível", "Cadastre uma impressão digital ou rosto nas configurações do aparelho e tente novamente.");
        return;
      }
      const resultado = await autenticarComDigital();
      if (!resultado.success) {
        Alert.alert("Identidade não confirmada", "Não foi possível concluir a autenticação biométrica.");
        return;
      }
      if (ativar) {
        await ativarDigital(user.id);
        Alert.alert("Biometria ativada", "Nos próximos acessos, você poderá desbloquear o aplicativo usando a biometria do aparelho.");
      } else {
        await desativarDigital(user.id);
        Alert.alert("Biometria desativada", "Nos próximos acessos, use sua senha normalmente.");
      }
      await refreshDigitalStatus();
    } catch (erro: any) {
      Alert.alert("Não foi possível alterar", descricaoErro(erro, "Tente novamente em alguns instantes."));
    } finally {
      setSalvandoDigital(false);
    }
  }

  async function salvarSenha() {
    if (!senhaAtual || !novaSenha || !confirmacaoSenha) {
      Alert.alert("Preencha os campos", "Informe a senha atual, a nova senha e a confirmação.");
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert("Senha muito curta", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmacaoSenha) {
      Alert.alert("Senhas diferentes", "A confirmação deve ser igual à nova senha.");
      return;
    }
    try {
      setAlterandoSenha(true);
      await alterarMinhaSenha({ senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
      setMostrarSenha(false);
      Alert.alert("Senha alterada", "Por segurança, entre novamente com a nova senha.", [
        { text: "Entrar novamente", onPress: () => { void signOut(); router.replace("/(auth)/login"); } },
      ]);
    } catch (erro: any) {
      Alert.alert("Não foi possível alterar", descricaoErro(erro, "Confira sua senha atual e tente novamente."));
    } finally {
      setAlterandoSenha(false);
    }
  }

  function confirmarExclusao() {
    if (!senhaExclusao) {
      Alert.alert("Confirme sua senha", "Informe sua senha atual para excluir a conta.");
      return;
    }
    Alert.alert(
      "Excluir conta?",
      "Você perderá o acesso ao aplicativo. Os dados de faturamento e contrato necessários continuarão armazenados pela Andrade Energy.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir conta", style: "destructive", onPress: () => void excluirConta() },
      ],
    );
  }

  async function excluirConta() {
    try {
      setExcluindo(true);
      await excluirMinhaConta(senhaExclusao);
      await signOut();
      router.replace("/(auth)/login");
    } catch (erro: any) {
      Alert.alert("Não foi possível excluir", descricaoErro(erro, "Confira sua senha atual e tente novamente."));
    } finally {
      setExcluindo(false);
    }
  }

  function sairDaConta() {
    Alert.alert("Sair da conta", "Deseja encerrar sua sessão neste aparelho?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader environmentName={origem === "comercial" ? "Gestão comercial" : "Gestão de usinas"} showPlantContext={origem !== "comercial"} title="Perfil" subtitle="Dados e segurança" contextTitle={user?.nome ?? "Meu perfil"} contextSubtitle="Gerencie seu acesso à Andrade Energy" icon="person-outline" /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <ScrollView
          bounces
          alwaysBounceVertical
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={atualizarPagina} refreshing={atualizando} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {!IS_GERADOR_APP ? <View style={styles.hero}>
            <TouchableOpacity onPress={() => void alterarFoto()} style={styles.avatar}>{fotoPerfil ? <Image source={{ uri: fotoPerfil }} style={styles.avatarImage} /> : <Ionicons color={Colors.surface} name="person" size={29} />}<View style={styles.cameraBadge}><Ionicons name="camera" size={12} color="#FFF" /></View></TouchableOpacity>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Perfil</Text>
              <Text style={styles.subtitle}>Seus dados, segurança e acesso à conta.</Text>
            </View>
          </View> : null}

        {IS_GERADOR_APP ? <TouchableOpacity onPress={() => void alterarFoto()} style={styles.photoRow}><View style={styles.avatar}>{fotoPerfil ? <Image source={{ uri: fotoPerfil }} style={styles.avatarImage} /> : <Ionicons color={Colors.surface} name="person" size={29} />}</View><View style={{ flex: 1 }}><Text style={styles.preferenceTitle}>Foto do perfil</Text><Text style={styles.preferenceDescription}>Toque para escolher uma imagem.</Text></View><Ionicons name="camera-outline" size={22} color={Colors.primary} /></TouchableOpacity> : null}

        <Text style={styles.sectionTitle}>DADOS PESSOAIS</Text>
        <View style={styles.card}>
          <Campo icon="person-outline" label="Nome completo" onChangeText={setNome} value={nome} />
          <Campo editable={false} hint="O CPF identifica suas unidades consumidoras." icon="card-outline" label="CPF" value={formatarCpf(cpf)} />
          <Campo autoCapitalize="none" autoCorrect={false} icon="mail-outline" keyboardType="email-address" label="E-mail" onChangeText={setEmail} value={email} />
          <Campo icon="call-outline" keyboardType="phone-pad" label="Telefone" last onChangeText={(valor) => setTelefone(formatarTelefone(valor))} placeholder="(00) 00000-0000" value={telefone} />
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} disabled={salvando} onPress={salvarDados} style={[styles.primaryButton, salvando && styles.buttonDisabled]}>
            {salvando ? <ActivityIndicator color={Colors.surface} /> : <><Ionicons color={Colors.surface} name="checkmark-circle-outline" size={20} /><Text style={styles.primaryButtonText}>Salvar alterações</Text></>}
          </TouchableOpacity>
        </View>

        {!IS_GERADOR_APP && user?.perfil === "LEITURA" && user?.cliente_id ? <>
          <Text style={styles.sectionTitle}>CONTAS DE ENERGIA</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              accessibilityLabel="Anexar ou consultar contas de energia"
              activeOpacity={0.82}
              onPress={() => router.push({ pathname: "/clientes/faturas-anexadas" as never, params: { clienteId: String(user.cliente_id) } })}
              style={[styles.linkRow, styles.standaloneRow]}
            >
              <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="document-attach-outline" size={22} /></View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceTitle}>Anexar conta vinculada ao CPF</Text>
                <Text style={styles.preferenceDescription}>Envie a conta da concessionária de uma UC vinculada ao seu CPF. Ela ficará no seu perfil e poderá ser usada pelo gerador ao cadastrar essa unidade.</Text>
              </View>
              <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
            </TouchableOpacity>
          </View>
        </> : null}

        {IS_GERADOR_APP && user?.perfil === "ADMIN" ? <>
          <Text style={styles.sectionTitle}>COMERCIALIZAÇÃO DO SOFTWARE</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.replace("/admin/comercial" as any)} style={[styles.linkRow, styles.standaloneRow]}>
              <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="briefcase-outline" size={22} /></View>
              <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Alternar para Gestão Comercial</Text><Text style={styles.preferenceDescription}>Abra a home comercial com indicadores, assinaturas e cobranças.</Text></View>
              <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.replace("/selecionar-unidade")} style={[styles.linkRow, styles.standaloneRow]}>
              <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="sunny-outline" size={22} /></View>
              <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Alternar para Gestão de Usinas</Text><Text style={styles.preferenceDescription}>Escolha uma usina e acesse o ambiente operacional.</Text></View>
              <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.push("/geradores/gestao" as any)} style={[styles.linkRow, styles.standaloneRow]}>
              <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="business-outline" size={22} /></View>
              <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Gestão comercial dos geradores</Text><Text style={styles.preferenceDescription}>Planos, assinaturas, mensalidades, contratos e situação de acesso.</Text></View>
              <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.push("/geradores/convidar")} style={[styles.linkRow, styles.standaloneRow]}>
              <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="person-add-outline" size={22} /></View>
              <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Convidar novo gerador</Text><Text style={styles.preferenceDescription}>Gere o único acesso autorizado para criação de contas geradoras.</Text></View>
              <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
            </TouchableOpacity>
          </View>
        </> : null}

        <Text style={styles.sectionTitle}>SEGURANÇA</Text>
        <View style={styles.cardGroup}>
          <View style={[styles.preferenceRow, styles.standaloneRow]}>
            <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="finger-print-outline" size={23} /></View>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>Entrar com biometria</Text>
              <Text style={styles.preferenceDescription}>{digitalDisponivel ? "Use a biometria cadastrada no aparelho para desbloquear o app." : "Nenhuma biometria está cadastrada neste aparelho."}</Text>
            </View>
            <Switch
              accessibilityLabel={digitalEnabled ? "Desligar biometria" : "Ligar biometria"}
              disabled={salvandoDigital || !digitalDisponivel}
              ios_backgroundColor="#CBD5E1"
              onValueChange={(valor) => void alterarDigital(valor)}
              thumbColor={Colors.surface}
              trackColor={{ false: "#CBD5E1", true: Colors.primary }}
              value={digitalEnabled}
            />
          </View>

          <TouchableOpacity activeOpacity={0.82} onPress={() => setMostrarSenha((aberto) => !aberto)} style={[styles.linkRow, styles.standaloneRow]}>
            <View style={styles.preferenceIcon}><Ionicons color={Colors.primary} name="lock-closed-outline" size={21} /></View>
            <View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Alterar senha</Text><Text style={styles.preferenceDescription}>Atualize sua senha de acesso quando precisar.</Text></View>
            <Ionicons color={Colors.subtitle} name={mostrarSenha ? "chevron-up" : "chevron-forward"} size={21} />
          </TouchableOpacity>

          {mostrarSenha ? <View style={[styles.panel, styles.standalonePanel]}>
            <Campo label="Senha atual" onChangeText={setSenhaAtual} secureTextEntry value={senhaAtual} />
            <Campo hint="Mínimo de 6 caracteres." label="Nova senha" onChangeText={setNovaSenha} secureTextEntry value={novaSenha} />
            <Campo label="Confirmar nova senha" last onChangeText={setConfirmacaoSenha} secureTextEntry value={confirmacaoSenha} />
            <TouchableOpacity activeOpacity={0.85} disabled={alterandoSenha} onPress={salvarSenha} style={[styles.secondaryButton, alterandoSenha && styles.buttonDisabled]}>
              {alterandoSenha ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryButtonText}>Atualizar senha</Text>}
            </TouchableOpacity>
          </View> : null}
        </View>

        <Text style={styles.sectionTitle}>CONTA</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity activeOpacity={0.82} onPress={sairDaConta} style={[styles.linkRow, styles.standaloneRow]}>
            <View style={[styles.preferenceIcon, styles.logoutIcon]}><Ionicons color={Colors.danger} name="log-out-outline" size={22} /></View>
            <View style={styles.preferenceCopy}><Text style={[styles.preferenceTitle, styles.dangerText]}>Sair da conta</Text><Text style={styles.preferenceDescription}>Encerra somente a sessão neste aparelho.</Text></View>
            <Ionicons color={Colors.subtitle} name="chevron-forward" size={21} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.82} onPress={() => setMostrarExclusao((aberto) => !aberto)} style={[styles.linkRow, styles.standaloneRow]}>
            <View style={[styles.preferenceIcon, styles.deleteIcon]}><Ionicons color={Colors.danger} name="trash-outline" size={22} /></View>
            <View style={styles.preferenceCopy}><Text style={[styles.preferenceTitle, styles.dangerText]}>Excluir conta</Text><Text style={styles.preferenceDescription}>Remove seu acesso ao aplicativo de forma definitiva.</Text></View>
            <Ionicons color={Colors.subtitle} name={mostrarExclusao ? "chevron-up" : "chevron-forward"} size={21} />
          </TouchableOpacity>

          {mostrarExclusao ? <View style={[styles.panel, styles.standalonePanel, styles.deletePanel]}>
            <Text style={styles.deleteWarning}>Para proteger sua conta, confirme sua senha antes de excluir o acesso.</Text>
            <Campo label="Senha atual" last onChangeText={setSenhaExclusao} secureTextEntry value={senhaExclusao} />
            <TouchableOpacity activeOpacity={0.85} disabled={excluindo} onPress={confirmarExclusao} style={[styles.deleteButton, excluindo && styles.buttonDisabled]}>
              {excluindo ? <ActivityIndicator color={Colors.surface} /> : <><Ionicons color={Colors.surface} name="trash-outline" size={19} /><Text style={styles.deleteButtonText}>Excluir minha conta</Text></>}
            </TouchableOpacity>
          </View> : null}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type CampoProps = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
  hint?: string;
  last?: boolean;
  secureTextEntry?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  onChangeText?: (valor: string) => void;
};

function Campo({ icon, label, value, editable = true, hint, last = false, ...inputProps }: CampoProps) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldLabelRow}>
        {icon ? <Ionicons color={Colors.subtitle} name={icon} size={17} /> : null}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput editable={editable} placeholderTextColor="#94A3B8" style={[styles.input, !editable && styles.inputDisabled]} value={value} {...inputProps} />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  hero: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  avatar: { width: 55, height: 55, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderRadius: Radius.round, backgroundColor: Colors.primary, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  cameraBadge: { position: "absolute", right: 0, bottom: 0, width: 21, height: 21, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: Colors.primaryDark },
  photoRow: { minHeight: 78, flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  heroCopy: { flex: 1 },
  title: { color: Colors.text, fontSize: Typography.section, fontWeight: "900" },
  subtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 19 },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  card: { overflow: "hidden", borderRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadows.card },
  cardGroup: { gap: Spacing.sm },
  standaloneRow: { overflow: "hidden", borderTopWidth: 0, borderWidth: 1, borderColor: "#D4E4DB", borderRadius: Radius.lg, backgroundColor: Colors.surface, ...Shadows.card },
  standalonePanel: { marginTop: -Spacing.xs, borderTopWidth: 0, borderWidth: 1, borderColor: "#D4E4DB", borderRadius: Radius.lg, backgroundColor: Colors.surface, ...Shadows.card },
  field: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "800" },
  input: { minHeight: 40, paddingVertical: 6, color: Colors.text, fontSize: Typography.body, fontWeight: "600" },
  inputDisabled: { color: Colors.subtitle },
  fieldHint: { marginTop: 1, color: Colors.subtitle, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, margin: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryButtonText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
  buttonDisabled: { opacity: 0.65 },
  preferenceRow: { minHeight: 84, flexDirection: "row", alignItems: "center", padding: Spacing.md },
  linkRow: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  preferenceIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  preferenceCopy: { flex: 1, marginHorizontal: Spacing.sm },
  preferenceTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  preferenceDescription: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  panel: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: "#F8FAFC" },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md },
  secondaryButtonText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" },
  logoutIcon: { backgroundColor: "#FEF2F2" },
  deleteIcon: { backgroundColor: "#FEE2E2" },
  dangerText: { color: Colors.danger },
  deletePanel: { backgroundColor: "#FFF7F7" },
  deleteWarning: { marginTop: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
  deleteButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.danger },
  deleteButtonText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "900" },
});
