import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboardGestor } from "../../hooks/useDashboardGestor";
import { importarFaturaGeradora } from "../../services/usinas.service";
import { obterLinkAplicativo } from "../../services/app-download.service";
import * as CarteiraService from "../../services/carteira.service";
import {
  marcarCarteiraComoVista,
  verificarNovoRecebimento,
} from "../../services/carteira-notificacoes.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import {
  AppHeader,
  Button,
  ElasticScrollView as ScrollView,
  EmptyState,
  Metric,
  Screen,
  Section,
} from "../ui";
import QuickAccessCarousel from "../QuickAccessCarousel";
import TabDataPending from "../ui/TabDataPending";
import AndradeBarChart from "../charts/AndradeBarChart";
import RevenueChart from "./RevenueChart";

function formatarEnergia(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
}

function formatarPercentual(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function rotuloCompetencia(valor: unknown) {
  const texto = String(valor ?? "");
  const correspondencia = texto.match(/^(\d{4})-(\d{2})/);
  if (!correspondencia) return texto.slice(0, 3) || "—";
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(Number(correspondencia[1]), Number(correspondencia[2]) - 1, 1))
    .replace(".", "");
}

const atalhos = [
  { icon: "card-outline", label: "Meu plano", rota: "/assinatura" },
  { icon: "people-outline", label: "Clientes", rota: "/clientes" },
  { icon: "person-add-outline", label: "Novo cliente", rota: "/clientes/novo" },
  { icon: "flash-outline", label: "Unidades consumidoras", rota: "/unidades" },
  { icon: "flash-outline", label: "Nova UC", rota: "/unidades/nova" },
  { icon: "document-attach-outline", label: "Faturar via PDF", rota: "/faturamento/manual" },
  { icon: "construct-outline", label: "Operação", rota: "/operacao" },
  { icon: "receipt-outline", label: "Faturamento", rota: "/faturamento" },
  { icon: "cash-outline", label: "Financeiro", rota: "/financeiro" },
  { icon: "receipt-outline", label: "Faturas", rota: "/faturas" },
  { icon: "document-text-outline", label: "Contratos", rota: "/contratos" },
  { icon: "people-circle-outline", label: "Colaboradores", rota: "/colaboradores?ambiente=gerador" },
] as const;

export default function DashboardGestor() {
  const { usuario, usinaSelecionada, suspenderBloqueioTemporariamente } =
    useAuth();
  const { data, isLoading, error, refetch } = useDashboardGestor();
  const colaborador = String(usuario?.papel_empresa ?? "").startsWith("COLABORADOR_");
  const [carteira, setCarteira] = useState<CarteiraService.Carteira | null>(
    null,
  );
  const [novoRecebimento, setNovoRecebimento] = useState(false);
  const [importando, setImportando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  async function carregarCarteira() {
    try {
      const proxima = await CarteiraService.carregarCarteira();
      setCarteira(proxima);
      if (usuario?.id)
        setNovoRecebimento(
          await verificarNovoRecebimento(
            String(usuario.id),
            proxima.totalRecebido,
          ),
        );
    } catch {
      /* O dashboard continua disponível se a carteira estiver temporariamente indisponível. */
    }
  }
  useEffect(() => {
    void carregarCarteira();
  }, [usuario?.id]);
  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await Promise.all([refetch(), carregarCarteira()]);
    } finally {
      setAtualizando(false);
    }
  }
  async function abrirCarteira() {
    setNovoRecebimento(false);
    await marcarCarteiraComoVista();
    router.push("/financeiro");
  }


  async function compartilharAppCliente() {
    try {
      await Share.share({
        message: `Baixe o aplicativo Andrade Energy Cliente pelo link: ${obterLinkAplicativo("consumidor")}`,
        title: "Compartilhar app do cliente",
      });
    } catch {
      Alert.alert("Não foi possível compartilhar", "Tente novamente em instantes.");
    }
  }

  async function atualizarGeracao() {
    const usinaId = usinaSelecionada?.id ?? usuario?.usina_id;
    if (!usinaId)
      return Alert.alert(
        "Usina não vinculada",
        "Escolha uma usina para importar os dados de produção.",
      );
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (arquivo.canceled) return;

      setImportando(true);
      const item = arquivo.assets[0];
      const resultado = await importarFaturaGeradora(
        usinaId,
        item.uri,
        item.name,
      );
      await refetch();
      Alert.alert(
        "Produção atualizada",
        `${formatarEnergia(resultado.dados.energiaGerada)} calculados pelas medições de ${resultado.dados.referencia}.`,
      );
    } catch (erro: any) {
      Alert.alert(
        "Não foi possível atualizar",
        erro?.response?.data?.message ??
          erro?.message ??
          "Confira a fatura da unidade geradora.",
      );
    } finally {
      setImportando(false);
      retomarBloqueio();
    }
  }

  // Sem seleção, inclusive no primeiro cadastro, a Home não é o destino.
  // A lista permite escolher uma usina existente ou cadastrar a primeira.
  if (!usinaSelecionada?.id && !usuario?.usina_id) {
    return <Redirect href="/selecionar-unidade" />;
  }
  if (isLoading) return <Screen><AppHeader title="Início" subtitle="Sua energia em um só lugar" contextTitle="Visão geral da operação" contextSubtitle="Preparando dados da usina" icon="sunny-outline" /><TabDataPending /></Screen>;
  if (error || !data)
    return (
      <Screen>
        <View style={styles.errorContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar a usina"
            subtitle="Verifique sua conexão e tente novamente."
          />
          <Button title="Escolher ou cadastrar usina" onPress={() => router.replace("/selecionar-unidade")} />
          <Button title="Tentar novamente" onPress={() => void refetch()} />
        </View>
      </Screen>
    );

  const historicoGeracao = (Array.isArray(data.historico) ? data.historico : [])
    .slice(0, 12)
    .reverse()
    .map((item: any) => ({
      label: rotuloCompetencia(item.competencia),
      value: Math.max(0, Number(item.energiaGerada ?? item.energia_gerada ?? 0)),
    }));
  const recebimentoProducaoAtivo = data.unidadeGeradora?.recebimento_email_ativo === true;
  const abrirRecebimentoProducao = () => {
    const unidadeGeradoraId = data.unidadeGeradora?.id;
    if (unidadeGeradoraId) {
      router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidadeGeradoraId, finalidade: "PRODUCAO_USINA" } });
      return;
    }
    const usinaId = usinaSelecionada?.id ?? usuario?.usina_id;
    if (usinaId) router.push({ pathname: "/usinas/[id]", params: { id: usinaId } });
  };

  return (
    <Screen>
      <AppHeader
        contextSubtitle={`Competência ${data.competencia}`}
        contextTitle="Visão geral da operação"
        icon="sunny-outline"
        subtitle="Sua energia em um só lugar"
        title="Início"
        onSearch={() => router.push({ pathname: "/pesquisa", params: { perfil: "usinas" } } as any)}
      />
      <ScrollView
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarPagina}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Section title="Acesso rápido" framed={false}>
          <QuickAccessCarousel
            storageKey={`gestor-home-${usuario?.id ?? "anonimo"}`}
            items={[
              {
                icon: "wallet-outline",
                label: "Valor financeiro disponível",
                value: carteira
                  ? formatarMoeda(carteira.saldoDisponivel)
                  : "Carregando...",
                badge: novoRecebimento,
                onPress: () => void abrirCarteira(),
              },
              ...atalhos.filter((atalho) => !colaborador || !["Colaboradores", "Novo cliente", "Nova usina", "Nova UC", "Financeiro"].includes(atalho.label)).map((atalho) => ({
                icon: atalho.icon,
                label: atalho.label,
                onPress: () => router.push(atalho.rota as any),
              })),
              ...(!colaborador && usinaSelecionada?.id ? [{
                icon: "create-outline" as const,
                label: "Editar dados da usina",
                onPress: () => router.push({ pathname: "/usinas/editar", params: { id: usinaSelecionada.id } }),
              }] : []),
              {
                icon: "share-social-outline",
                label: "Compartilhar app do cliente",
                onPress: () => void compartilharAppCliente(),
              },
            ]}
          />
        </Section>

        <View style={styles.generationSummary}>
          <View style={styles.generationSummaryTop}>
            <View>
              <Text style={styles.generationEyebrow}>GERAÇÃO DO MÊS</Text>
              <Text style={styles.generationValue}>
                {formatarEnergia(data.energiaGerada)}
              </Text>
              <Text style={styles.generationCaption}>
                Energia produzida na competência atual
              </Text>
              {recebimentoProducaoAtivo ? <View style={styles.generationAutoBadge}>
                <Ionicons name="checkmark-circle" size={15} color="#A7F3D0" />
                <Text style={styles.generationAutoText}>Dados automáticos ativados</Text>
              </View> : null}
            </View>
            <View style={styles.generationIcon}>
              <Ionicons name="sunny" size={27} color="#F6CC32" />
            </View>
          </View>
          <View style={styles.generationFooter}>
            <Text style={styles.generationFooterText}>
              {formatarPercentual(data.capacidadeReservada)} reservada
            </Text>
            <Text style={styles.generationFooterText}>
              {formatarPercentual(data.capacidadeDisponivel)} livre
            </Text>
          </View>
          <View style={styles.generationActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importar dados de produção via PDF"
              disabled={importando}
              onPress={atualizarGeracao}
              style={[styles.generationAction, styles.generationActionPrimary, importando && styles.disabled]}
            >
              <Ionicons name="document-attach-outline" size={22} color="#0A513E" />
              <Text style={styles.generationActionTitle}>{importando ? "Lendo PDF..." : "Importar via PDF"}</Text>
              <Text style={styles.generationActionSubtitle}>Dados de produção</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recebimentoProducaoAtivo ? "Gerenciar recebimento automático de dados da usina" : "Ativar recebimento automático de dados de produção"}
              onPress={abrirRecebimentoProducao}
              style={[styles.generationAction, styles.generationActionSecondary]}
            >
              <Ionicons name={recebimentoProducaoAtivo ? "checkmark-circle-outline" : "mail-unread-outline"} size={22} color="#FFFFFF" />
              <Text style={[styles.generationActionTitle, styles.generationActionTitleSecondary]}>{recebimentoProducaoAtivo ? "Gerenciar automático" : "Receber automático"}</Text>
              <Text style={[styles.generationActionSubtitle, styles.generationActionSubtitleSecondary]}>Dados da usina</Text>
            </Pressable>
          </View>
        </View>

        {historicoGeracao.length ? (
          <AndradeBarChart
            title="Desempenho da geração"
            subtitle="Produção real processada por competência"
            data={historicoGeracao}
            color={Colors.primary}
            totalLabel="Produção no período"
            formatTotal={formatarEnergia}
          />
        ) : null}

        {carteira ? (
          <Pressable
            onPress={() => void abrirCarteira()}
            style={styles.walletSummary}
          >
            <View style={styles.walletSummaryTop}>
              <View>
                <Text style={styles.walletEyebrow}>CARTEIRA ANDRADE</Text>
                <Text style={styles.walletBalance}>
                  {formatarMoeda(carteira.saldoDisponivel)}
                </Text>
                <Text style={styles.walletCaption}>
                  Valor disponível para transferência
                </Text>
              </View>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={25} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.walletFooter}>
              <Text style={styles.walletFooterText}>
                Recebido: {formatarMoeda(carteira.totalRecebido)}
              </Text>
              <Text style={styles.walletFooterText}>
                {carteira.transferenciaAutomatica
                  ? "Repasse automático ativo"
                  : "Repasse manual"}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <RevenueChart
          previsto={data.receitaPrevista}
          recebido={data.receitaRealizada}
        />

        {!colaborador ? (
          <Pressable onPress={() => router.push("/colaboradores?ambiente=gerador" as any)} style={styles.teamCard}>
            <View style={styles.teamIcon}>
              <Ionicons name="people-circle-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.teamCopy}>
              <Text style={styles.teamTitle}>Gerencie sua equipe</Text>
              <Text style={styles.teamText}>Convide colaboradores, escolha as permissões operacionais e bloqueie acessos. Carteira, recebíveis e transferências permanecem exclusivos do titular.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </Pressable>
        ) : null}

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeading}>
            <View style={styles.overviewIcon}>
              <Ionicons name="grid-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.overviewCopy}>
              <Text accessibilityRole="header" style={styles.operationTitle}>Visão geral</Text>
              <Text style={styles.overviewCaption}>Indicadores da sua usina · {data.competencia}</Text>
            </View>
          </View>
          <View style={styles.grid}>
            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="sunny-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Geração no mês"
                value={formatarEnergia(data.energiaGerada)}
              />
            </View>
            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Clientes ativos"
                value={data.clientes}
              />
            </View>
            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Receita prevista"
                value={formatarMoeda(data.receitaPrevista)}
              />
            </View>
            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="battery-charging-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Energia disponível"
                value={formatarEnergia(data.energiaDisponivel)}
              />
            </View>
          </View>
        </View>

        <View style={styles.operationCard}>
          <View style={styles.operationHeading}>
            <View>
              <Text style={styles.operationEyebrow}>DESEMPENHO</Text>
              <Text style={styles.operationTitle}>Uso da energia</Text>
            </View>
            <View style={styles.status}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Operação ativa</Text>
            </View>
          </View>
          <View style={styles.allocationRow}>
            <View>
              <Text style={styles.allocationValue}>
                {formatarPercentual(data.ocupacao)}
              </Text>
              <Text style={styles.allocationLabel}>energia alocada</Text>
            </View>
            <View style={styles.availableCopy}>
              <Text style={styles.availableValue}>
                {formatarEnergia(data.energiaDisponivel)}
              </Text>
              <Text style={styles.allocationLabel}>energia não distribuída</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progress,
                {
                  width: `${Math.min(Math.max(Number(data.ocupacao), 0), 100)}%`,
                },
              ]}
            />
          </View>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  errorContent: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#C9DED1",
    borderRadius: Radius.xl,
    backgroundColor: "#F4FAF6",
    ...Shadows.card,
  },
  teamIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  teamCopy: { flex: 1, minWidth: 0 },
  teamTitle: { color: Colors.text, fontSize: Typography.caption, fontWeight: "900" },
  teamText: { marginTop: 3, color: Colors.subtitle, fontSize: 11, lineHeight: 16 },
  operationCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  operationHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  operationEyebrow: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  operationTitle: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "900",
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
  },
  statusDot: {
    width: 7,
    height: 7,
    marginRight: 6,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  statusText: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "800",
  },
  allocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: Spacing.lg,
  },
  allocationValue: { color: Colors.text, fontSize: 28, fontWeight: "900" },
  availableCopy: { alignItems: "flex-end" },
  availableValue: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  allocationLabel: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    marginTop: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
  },
  progress: {
    height: "100%",
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  disabled: { opacity: 0.65 },
  generationSummary: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#0A513E",
    ...Shadows.card,
  },
  generationSummaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  generationEyebrow: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  generationValue: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  generationCaption: { marginTop: 3, color: "#CDEBDE", fontSize: 12 },
  generationAutoBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  generationAutoText: { color: "#D1FAE5", fontSize: 11, fontWeight: "700" },
  generationActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg },
  generationAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  generationActionPrimary: { backgroundColor: "#E5F8ED" },
  generationActionSecondary: { borderWidth: 1, borderColor: "rgba(255,255,255,.45)", backgroundColor: "rgba(255,255,255,.10)" },
  generationActionTitle: { marginTop: 5, color: "#0A513E", fontSize: 12, fontWeight: "900" },
  generationActionTitleSecondary: { color: "#FFFFFF" },
  generationActionSubtitle: { marginTop: 2, color: "#305C4C", fontSize: 10 },
  generationActionSubtitleSecondary: { color: "#D1FAE5" },
  generationIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  generationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.16)",
  },
  generationFooterText: { color: "#D1FAE5", fontSize: 11, fontWeight: "700" },
  walletSummary: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#063E31",
    ...Shadows.card,
  },
  walletSummaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletEyebrow: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  walletBalance: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  walletCaption: { marginTop: 3, color: "#CDEBDE", fontSize: 12 },
  walletIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: "rgba(255,255,255,.13)",
  },
  walletFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.16)",
  },
  walletFooterText: { color: "#D1FAE5", fontSize: 11, fontWeight: "700" },
  overviewCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  overviewHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCopy: { flex: 1, minWidth: 0 },
  overviewCaption: { marginTop: 4, color: Colors.subtitle, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  metric: { flexGrow: 1, flexBasis: "45%", minWidth: 120 },
});
