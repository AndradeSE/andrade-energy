import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppHeader, Card, ElasticScrollView as ScrollView, EmptyState, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import {
  ativarRecebimentoFaturas,
  desativarRecebimentoFaturas,
  obterConfirmacaoEncaminhamentoGmail,
  obterRecebimentoFaturas,
  regenerarEnderecoRecebimento,
  StatusRecebimentoFaturas,
} from "../../services/recebimento-faturas.service";
import {
  ConexaoEmail,
  concluirConexaoEmailUmaVez,
  desconectarConexaoEmail,
  iniciarConexaoEmail,
  listarConexoesEmail,
  ProvedorEmail,
} from "../../services/conexoes-email.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const titulosStatus: Record<string, string> = {
  NAO_CONFIGURADO: "Não configurado",
  AGUARDANDO_FATURA: "Aguardando a primeira conta",
  AGUARDANDO_CONFERENCIA: "Conta recebida para conferência",
  PRODUCAO_IMPORTADA: "Produção da usina importada",
  PROCESSADO: "Última conta processada",
  DESATIVADO: "Recebimento desativado",
  ERRO: "Atenção necessária",
};

function formatarData(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

WebBrowser.maybeCompleteAuthSession();

// O cliente pode escolher conectar a conta diretamente ou seguir o tutorial
// de encaminhamento por regra, logo abaixo. Os dois caminhos são opcionais.
const CONEXAO_DIRETA_DISPONIVEL = true;

const STATUS_CONEXAO_ATIVA = [
  "CONECTADO",
  "ATIVO",
  "AUTORIZADO",
  "REGRA_ATIVA",
  "CONECTADO_SEM_REGRA",
  "LEITURA_AUTORIZADA",
];

function tituloProvedor(provedor: string) {
  return provedor.toUpperCase() === "OUTLOOK" ? "Outlook" : "Gmail";
}

function conexaoAtiva(conexao: ConexaoEmail) {
  return STATUS_CONEXAO_ATIVA.includes(conexao.status.toUpperCase());
}

function tituloStatusConexao(status: string) {
  const statusNormalizado = status.toUpperCase();
  if (statusNormalizado === "REGRA_ATIVA") return "Regra de faturas ativa";
  if (statusNormalizado === "LEITURA_AUTORIZADA") return "Leitura autorizada";
  if (statusNormalizado === "CONECTADO_SEM_REGRA") return "Conectado";
  if (STATUS_CONEXAO_ATIVA.includes(statusNormalizado)) return "Conectado";
  if (["PENDENTE", "AGUARDANDO_AUTORIZACAO"].includes(statusNormalizado)) return "Aguardando autorização";
  if (statusNormalizado === "ERRO") return "Atenção necessária";
  return "Em configuração";
}

function mensagemConexao(conexao: ConexaoEmail) {
  return conexao.erro ?? conexao.regra?.erro ?? conexao.mensagem ?? null;
}

function valorDaUrl(url: string, nome: string) {
  const valor = Linking.parse(url).queryParams?.[nome];
  return Array.isArray(valor) ? valor[0] : valor;
}

function parametroUnico(valor?: string | string[]) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default function RecebimentoEmail() {
  const { unidadeSelecionada } = useAuth();
  const params = useLocalSearchParams<{ conexao?: string | string[]; unidadeId?: string | string[] }>();
  const [dados, setDados] = useState<StatusRecebimentoFaturas>();
  const [conexoes, setConexoes] = useState<ConexaoEmail[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoGmail, setConfirmandoGmail] = useState(false);
  const [conectandoProvedor, setConectandoProvedor] = useState<ProvedorEmail | null>(null);
  const [desconectandoId, setDesconectandoId] = useState<string | null>(null);
  // A tela pode abrir tanto uma UC consumidora quanto a UC geradora. A
  // finalidade sempre vem do backend, evitando rotular uma fatura de cliente
  // como se fosse produção da usina.
  const unidadeIdParam = parametroUnico(params.unidadeId);
  const unidadeId = unidadeIdParam ?? unidadeSelecionada?.id;
  const recebimentoDeProducao = dados?.finalidade === "PRODUCAO_USINA";
  const unidadeExibida = dados?.unidade ?? unidadeSelecionada;

  const rotaAtual = useCallback((conexao?: "sucesso" | "erro") => {
    return {
      pathname: "/unidades/recebimento-email" as const,
      params: {
        ...(unidadeIdParam ? { unidadeId: unidadeIdParam } : {}),
        ...(conexao ? { conexao } : {}),
      },
    };
  }, [unidadeIdParam]);

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setCarregando(false);
      return;
    }
    try {
      const [recebimento, conexoesDaUnidade] = await Promise.all([
        obterRecebimentoFaturas(unidadeId),
        CONEXAO_DIRETA_DISPONIVEL ? listarConexoesEmail(unidadeId) : Promise.resolve([]),
      ]);
      setDados(recebimento);
      setConexoes(conexoesDaUnidade);
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? "Confira sua conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [unidadeId]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  useEffect(() => {
    const resultado = Array.isArray(params.conexao) ? params.conexao[0] : params.conexao;
    if (!resultado) return;

    Alert.alert(
      resultado === "sucesso" ? "E-mail conectado" : "Não foi possível conectar",
      resultado === "sucesso"
        ? recebimentoDeProducao
          ? "A conexão foi concluída. As contas da usina poderão atualizar a produção automaticamente."
          : "A conexão foi concluída. As contas da concessionária poderão ser importadas automaticamente."
        : "A autorização não foi concluída. Você pode tentar novamente quando quiser.",
    );
    router.replace(rotaAtual());
  }, [params.conexao, recebimentoDeProducao, rotaAtual]);

  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }

  async function ativar() {
    if (!unidadeId) return;
    try {
      setSalvando(true);
      setDados(await ativarRecebimentoFaturas(unidadeId));
    } catch (erro: any) {
      Alert.alert("Não foi possível ativar", erro?.response?.data?.message ?? "Tente novamente em alguns instantes.");
    } finally { setSalvando(false); }
  }

  async function copiarEndereco() {
    if (!dados?.endereco) return;
    await Clipboard.setStringAsync(dados.endereco);
    Alert.alert("Endereço copiado", "Cole este endereço na regra de encaminhamento do seu e-mail.");
  }

  async function confirmarEnderecoGmail() {
    if (!unidadeId) return;
    try {
      setConfirmandoGmail(true);
      const confirmacao = await obterConfirmacaoEncaminhamentoGmail(unidadeId);
      if (!confirmacao.url) {
        Alert.alert(
          "Confirmação ainda não chegou",
          "No Gmail, adicione o endereço exclusivo na aba Encaminhamento e aguarde alguns instantes. Depois toque aqui novamente.",
        );
        return;
      }

      await WebBrowser.openBrowserAsync(confirmacao.url);
      Alert.alert(
        "Confirmação concluída?",
        "Se você confirmou na página do Google, volte ao Gmail para criar o filtro da CEMIG.",
      );
    } catch (erro: any) {
      Alert.alert(
        "Não foi possível abrir a confirmação",
        erro?.response?.data?.message ?? "Atualize a tela e tente novamente em alguns instantes.",
      );
    } finally {
      setConfirmandoGmail(false);
    }
  }

  function confirmarRegeneracao() {
    const aviso = recebimentoDeProducao
      ? "O endereço atual deixará de receber contas da usina. Depois, remova a regra antiga do Gmail/Outlook e crie outra com o novo endereço."
      : "O endereço atual deixará de receber contas. Depois, remova a regra antiga do Gmail/Outlook e crie outra com o novo endereço.";
    Alert.alert("Gerar novo endereço", aviso, [
      { text: "Cancelar", style: "cancel" },
      { text: "Gerar novo", style: "destructive", onPress: async () => {
        if (!unidadeId) return;
        try { setSalvando(true); setDados(await regenerarEnderecoRecebimento(unidadeId)); }
        catch (erro: any) { Alert.alert("Não foi possível gerar", erro?.response?.data?.message ?? "Tente novamente."); }
        finally { setSalvando(false); }
      } },
    ]);
  }

  function confirmarDesativacao() {
    Alert.alert("Desativar recebimento", recebimentoDeProducao ? "Novas contas da usina encaminhadas deixarão de atualizar a produção automaticamente." : "Novas contas encaminhadas deixarão de ser processadas automaticamente.", [
      { text: "Voltar", style: "cancel" },
      { text: "Desativar", style: "destructive", onPress: async () => {
        if (!unidadeId) return;
        try { setSalvando(true); setDados(await desativarRecebimentoFaturas(unidadeId)); }
        catch (erro: any) { Alert.alert("Não foi possível desativar", erro?.response?.data?.message ?? "Tente novamente."); }
        finally { setSalvando(false); }
      } },
    ]);
  }

  async function conectarEmail(provedor: ProvedorEmail) {
    if (!unidadeId) return;

    try {
      setConectandoProvedor(provedor);
      const { url } = await iniciarConexaoEmail(unidadeId, provedor);
      const redirectUrl = Linking.createURL("email-conectado");
      const resultado = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (resultado.type !== "success") {
        return;
      }

      const state = valorDaUrl(resultado.url, "state");
      const erro = valorDaUrl(resultado.url, "error");
      if (!state || erro) {
        router.replace(rotaAtual("erro"));
        return;
      }

      // A confirmação é feita com o state no backend; tokens do provedor não
      // passam pelo aplicativo. A rota de deep link mantém este mesmo fluxo
      // como alternativa quando o SO abre o app diretamente.
      await concluirConexaoEmailUmaVez(state);
      await carregar();
      router.replace(rotaAtual("sucesso"));
    } catch (erro: any) {
      Alert.alert(
        `Não foi possível conectar o ${tituloProvedor(provedor)}`,
        erro?.response?.data?.message ?? "Confira sua conexão e tente novamente.",
      );
    } finally {
      setConectandoProvedor(null);
    }
  }

  function confirmarDesconexao(conexao: ConexaoEmail) {
    const provedor = tituloProvedor(conexao.provedor);
    Alert.alert(
      `Desconectar ${provedor}`,
      recebimentoDeProducao
        ? "A Andrade Energy deixará de buscar novas contas da usina neste e-mail. Isso não apaga produções já importadas."
        : "A Andrade Energy deixará de buscar novas contas neste e-mail. Isso não apaga faturas já importadas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            try {
              setDesconectandoId(conexao.id);
              await desconectarConexaoEmail(conexao.id);
              await carregar();
            } catch (erro: any) {
              Alert.alert("Não foi possível desconectar", erro?.response?.data?.message ?? "Tente novamente em alguns instantes.");
            } finally {
              setDesconectandoId(null);
            }
          },
        },
      ],
    );
  }

  if (carregando) return <Loading />;
  if (!unidadeId) return <Screen><View style={styles.state}><EmptyState icon="flash-outline" title={IS_GERADOR_APP ? "Abra uma usina" : "Escolha uma unidade"} subtitle={IS_GERADOR_APP ? "Abra os detalhes da usina e escolha receber produção por e-mail." : "Selecione uma unidade consumidora antes de configurar o recebimento automático."} /></View></Screen>;

  const status = dados?.status ?? "NAO_CONFIGURADO";
  const tituloStatus = titulosStatus[status] ?? "Em configuração";
  const temErro = status === "ERRO";
  const gmailConectado = conexoes.some((conexao) => conexao.provedor.toUpperCase() === "GMAIL" && conexaoAtiva(conexao));
  const outlookConectado = conexoes.some((conexao) => conexao.provedor.toUpperCase() === "OUTLOOK" && conexaoAtiva(conexao));

  return <Screen>
    {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Recebimento automático" subtitle={recebimentoDeProducao ? "Produção da usina" : "Conta da unidade"} contextTitle="Recebimento automático" contextSubtitle={`${recebimentoDeProducao ? "Produção da UC" : "UC"} ${unidadeExibida?.numero ?? unidadeId}`} icon="mail-outline" /> : null}
    <ScrollView bounces alwaysBounceVertical overScrollMode="always" refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.headingText}><Text style={styles.eyebrow}>{recebimentoDeProducao ? "SUA USINA" : "SUA CONTA DE LUZ"}</Text><Text style={styles.title}>{recebimentoDeProducao ? "Receber produção automaticamente" : "Receber contas automaticamente"}</Text><Text style={styles.subtitle}>{recebimentoDeProducao ? "Encaminhe a conta da concessionária da usina para registrar as medições e a produção com segurança." : "Encaminhe somente as faturas recebidas de fatura@cemig para leitura e cálculo seguros."}</Text></View>
      </View>

      <Card style={styles.unitCard}>
        <View style={styles.unitIcon}><Ionicons name="flash-outline" size={23} color={Colors.primary} /></View>
        <View style={styles.unitInfo}><Text style={styles.unitLabel}>{recebimentoDeProducao ? "UNIDADE GERADORA" : "UNIDADE CONSUMIDORA"}</Text><Text style={styles.unitNumber}>{unidadeExibida?.numero ?? "Não identificada"}</Text></View>
      </Card>

      {dados?.configurado && !dados.ativo ? <TouchableOpacity disabled={salvando} activeOpacity={0.84} onPress={ativar} style={[styles.primaryAction, salvando && styles.disabled]}>
        <Ionicons name="mail-unread-outline" size={21} color={Colors.surface} />
        <Text style={styles.primaryText}>{salvando ? "Ativando..." : recebimentoDeProducao ? "Ativar recebimento de produção" : "Ativar recebimento automático"}</Text>
      </TouchableOpacity> : null}

      {dados?.configurado && dados.ativo && dados.endereco ? <>
        <Text style={styles.sectionTitle}>SEU ENDEREÇO EXCLUSIVO</Text>
        <TouchableOpacity activeOpacity={0.82} onPress={copiarEndereco} style={styles.addressCard}>
          <View style={styles.addressIcon}><Ionicons name="mail-outline" size={21} color={Colors.primary} /></View>
          <Text selectable style={styles.address}>{dados.endereco}</Text>
          <Ionicons name="copy-outline" size={21} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.addressHint}>Toque para copiar. Este endereço é exclusivo desta {recebimentoDeProducao ? "usina" : "UC"} e pode ser alterado a qualquer momento.</Text>
        <TouchableOpacity disabled={salvando} onPress={confirmarRegeneracao} style={styles.secondaryAction}><Ionicons name="refresh-outline" size={19} color={Colors.primary} /><Text style={styles.secondaryText}>Gerar novo endereço</Text></TouchableOpacity>
        <TouchableOpacity disabled={salvando} onPress={confirmarDesativacao} style={styles.dangerAction}><Ionicons name="close-circle-outline" size={19} color={Colors.danger} /><Text style={styles.dangerText}>Desativar recebimento</Text></TouchableOpacity>
        <Text style={styles.inlineSectionTitle}>CONECTAR SEU E-MAIL</Text>
        <View style={styles.providerActions}>
          <TouchableOpacity
            accessibilityLabel="Conectar Gmail"
            activeOpacity={0.84}
            disabled={Boolean(conectandoProvedor) || gmailConectado}
            onPress={() => conectarEmail("GMAIL")}
            style={[styles.providerButton, (Boolean(conectandoProvedor) || gmailConectado) && styles.providerButtonDisabled]}
          >
            <Ionicons name="logo-google" size={20} color={gmailConectado ? Colors.subtitle : Colors.primary} />
            <Text style={[styles.providerButtonText, gmailConectado && styles.providerButtonTextDisabled]}>{conectandoProvedor === "GMAIL" ? "Conectando..." : gmailConectado ? "Gmail conectado" : "Conectar Gmail"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Conectar Outlook"
            activeOpacity={0.84}
            disabled={Boolean(conectandoProvedor) || outlookConectado}
            onPress={() => conectarEmail("OUTLOOK")}
            style={[styles.providerButton, (Boolean(conectandoProvedor) || outlookConectado) && styles.providerButtonDisabled]}
          >
            <Ionicons name="mail-outline" size={20} color={outlookConectado ? Colors.subtitle : Colors.primary} />
            <Text style={[styles.providerButtonText, outlookConectado && styles.providerButtonTextDisabled]}>{conectandoProvedor === "OUTLOOK" ? "Conectando..." : outlookConectado ? "Outlook conectado" : "Conectar Outlook"}</Text>
          </TouchableOpacity>
        </View>
      </> : null}

      {!dados?.configurado ? <Card style={styles.pendingCard}><Ionicons name="time-outline" size={24} color={Colors.warning} /><View style={styles.pendingCopy}><Text style={styles.pendingTitle}>Configuração em preparação</Text><Text style={styles.pendingText}>O endereço de recebimento será liberado assim que a Andrade Energy concluir a configuração segura do domínio.</Text></View></Card> : <>
        <Card style={[styles.statusCard, temErro && styles.statusCardError]}>
          <View style={[styles.statusIcon, temErro && styles.statusIconError]}><Ionicons name={temErro ? "alert-circle-outline" : dados?.ativo ? "mail-unread-outline" : "mail-outline"} size={23} color={temErro ? Colors.danger : Colors.primary} /></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>{tituloStatus}</Text><Text style={styles.statusText}>{dados?.ativo ? recebimentoDeProducao ? "As contas enviadas a este endereço registram a produção da usina." : "As contas enviadas a este endereço entram na fila de conferência." : recebimentoDeProducao ? "Ative para gerar o endereço exclusivo da usina." : "Ative para gerar o endereço exclusivo desta unidade."}</Text></View>
        </Card>

       {dados?.ativo && dados.endereco ? <>
          {conexoes.length ? <View style={styles.connectionsList}>
            {conexoes.map((conexao) => <Card key={conexao.id} style={[styles.connectionCard, conexao.status.toUpperCase() === "ERRO" && styles.connectionCardError]}>
              <View style={[styles.connectionIcon, conexao.status.toUpperCase() === "ERRO" && styles.connectionIconError]}><Ionicons name={conexao.status.toUpperCase() === "ERRO" ? "alert-circle-outline" : "mail-open-outline"} size={21} color={conexao.status.toUpperCase() === "ERRO" ? Colors.danger : Colors.primary} /></View>
              <View style={styles.connectionCopy}>
                <Text style={styles.connectionTitle}>{tituloProvedor(conexao.provedor)} · {tituloStatusConexao(conexao.status)}</Text>
                <Text style={styles.connectionText}>{conexao.email ?? "Conta autorizada"}{conexao.conectadoEm ? ` · ${formatarData(conexao.conectadoEm)}` : ""}</Text>
                {mensagemConexao(conexao) ? <Text style={styles.connectionError}>{mensagemConexao(conexao)}</Text> : null}
              </View>
              <TouchableOpacity accessibilityLabel={`Desconectar ${tituloProvedor(conexao.provedor)}`} disabled={desconectandoId === conexao.id} onPress={() => confirmarDesconexao(conexao)} style={styles.disconnectButton}>
                <Ionicons name="close-circle-outline" size={21} color={Colors.danger} />
              </TouchableOpacity>
            </Card>)}
          </View> : null}

          <Text style={styles.sectionTitle}>PREFERE ENCAMINHAR MANUALMENTE?</Text>
          <Card>
            <GuiaCabecalho icon="logo-google" titulo="Gmail" subtitulo="Crie um filtro no Gmail pelo navegador." />
            <Instruction number="1" text="Abra Configurações > Ver todas as configurações > Encaminhamento e POP/IMAP > Adicionar um endereço de encaminhamento." />
            <Instruction number="2" text="Cole o endereço exclusivo exibido acima e confirme. O Gmail enviará uma confirmação para esse endereço." />
            <Instruction number="3" text="Volte aqui e toque no botão abaixo para abrir a confirmação do Gmail com segurança." />
            <TouchableOpacity disabled={confirmandoGmail} onPress={confirmarEnderecoGmail} activeOpacity={0.84} style={[gmailStyles.action, confirmandoGmail && styles.disabled]}>
              <Ionicons name="logo-google" size={20} color={Colors.surface} />
              <Text style={gmailStyles.actionText}>{confirmandoGmail ? "Procurando confirmação..." : "Confirmar endereço no Gmail"}</Text>
            </TouchableOpacity>
            <Text style={gmailStyles.hint}>Depois de adicionar o endereço no Gmail, aguarde alguns instantes antes de tocar no botão.</Text>
            <Instruction number="4" text="No Gmail, abra Filtros e endereços bloqueados > Criar um filtro. No campo de pesquisa, cole: from:(fatura@cemig) has:attachment filename:pdf" />
            <Instruction number="5" text="Clique em Criar filtro, marque Encaminhar para, escolha o endereço exclusivo confirmado e finalize o filtro." last />
          </Card>

          <Card>
            <GuiaCabecalho icon="mail-outline" titulo="Outlook / Hotmail" subtitulo="Crie uma regra no Outlook pelo navegador." />
            <Instruction number="1" text="Abra Configurações > E-mail > Regras e toque em Adicionar nova regra." />
            <Instruction number="2" text={recebimentoDeProducao ? "Dê o nome “Produção da usina — Andrade Energy”." : "Dê o nome “Fatura CEMIG — Andrade Energy”."} />
            <Instruction number="3" text="Em condição, escolha De: fatura@cemig e adicione também Possui anexo." />
            <Instruction number="4" text="Em ação, escolha Encaminhar para, cole o endereço exclusivo acima e salve a regra." last />
          </Card>

          <Text style={styles.connectionHint}>{recebimentoDeProducao ? "A regra encaminha as faturas com anexo da usina; o sistema só processa PDFs válidos para registrar a produção da competência." : "A regra encaminha as faturas CEMIG com anexo; o sistema só processa PDFs válidos e as demais mensagens continuam no seu e-mail."}</Text>

          {dados.ultimoRecebimentoEm ? <Text style={styles.lastReceipt}>Último recebimento: {formatarData(dados.ultimoRecebimentoEm)}</Text> : null}
          {dados.erro ? <Text style={styles.errorText}>{dados.erro}</Text> : null}

        </> : null}
      </>}
    </ScrollView>
  </Screen>;
}

function Instruction({ number, text, last = false }: { number: string; text: string; last?: boolean }) {
  return <View style={[styles.instruction, !last && styles.instructionBorder]}><View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{number}</Text></View><Text style={styles.instructionText}>{text}</Text></View>;
}

function GuiaCabecalho({ icon, titulo, subtitulo }: { icon: keyof typeof Ionicons.glyphMap; titulo: string; subtitulo: string }) {
  return <View style={guiaStyles.header}><View style={guiaStyles.icon}><Ionicons name={icon} size={21} color={Colors.primary} /></View><View style={guiaStyles.copy}><Text style={guiaStyles.title}>{titulo}</Text><Text style={guiaStyles.subtitle}>{subtitulo}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, heading: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.lg }, back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.round, backgroundColor: Colors.surface }, headingText: { flex: 1 }, eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, title: { marginTop: 4, color: Colors.text, fontSize: Typography.section, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 20 }, unitCard: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, padding: Spacing.md }, unitIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, unitInfo: { marginLeft: Spacing.sm }, unitLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: .7 }, unitNumber: { marginTop: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, privacyCard: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md }, privacyIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, privacyCopy: { flex: 1, marginLeft: Spacing.sm }, privacyTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, privacyText: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 }, providerActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.xl }, providerButton: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.surface }, providerButtonDisabled: { borderColor: Colors.border, backgroundColor: Colors.background }, providerButtonText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" }, providerButtonTextDisabled: { color: Colors.subtitle }, connectionsList: { gap: Spacing.sm, marginTop: Spacing.sm }, connectionCard: { flexDirection: "row", alignItems: "center", padding: Spacing.md }, connectionCardError: { borderWidth: 1, borderColor: "#FECACA" }, connectionIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, connectionIconError: { backgroundColor: "#FEE2E2" }, connectionCopy: { flex: 1, marginLeft: Spacing.sm }, connectionTitle: { color: Colors.text, fontSize: Typography.small, fontWeight: "900" }, connectionText: { marginTop: 2, color: Colors.subtitle, fontSize: 11, lineHeight: 16 }, connectionError: { marginTop: 3, color: Colors.danger, fontSize: 11, lineHeight: 16 }, disconnectButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginLeft: Spacing.xs }, connectionHint: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 }, pendingCard: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md }, pendingCopy: { flex: 1, marginLeft: Spacing.sm }, pendingTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, pendingText: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 }, statusCard: { flexDirection: "row", alignItems: "center", padding: Spacing.md }, statusCardError: { borderWidth: 1, borderColor: "#FECACA" }, statusIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, statusIconError: { backgroundColor: "#FEE2E2" }, statusCopy: { flex: 1, marginLeft: Spacing.sm }, statusTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, statusText: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: .9 }, inlineSectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.xs, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: .9 }, addressCard: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg, backgroundColor: Colors.surface }, addressIcon: { marginRight: Spacing.sm }, address: { flex: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, addressHint: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, instruction: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm }, instructionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border }, instructionNumber: { width: 28, height: 28, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, instructionNumberText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" }, instructionText: { flex: 1, color: Colors.text, fontSize: Typography.small, lineHeight: 19 }, lastReceipt: { marginTop: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small }, errorText: { marginTop: Spacing.xs, color: Colors.danger, fontSize: Typography.small, lineHeight: 18 }, primaryAction: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xl, borderRadius: Radius.lg, backgroundColor: Colors.primary }, primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" }, disabled: { opacity: .65 }, secondaryAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md }, secondaryText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" }, dangerAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.sm, borderRadius: Radius.md }, dangerText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "900" },
});

const guiaStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  copy: { flex: 1, marginLeft: Spacing.sm },
  title: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" },
  subtitle: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 17 },
});

const gmailStyles = StyleSheet.create({
  action: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primary },
  actionText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "900" },
  hint: { marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
});
