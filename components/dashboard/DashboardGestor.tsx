import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboardGestor } from "../../hooks/useDashboardGestor";
import { importarFaturaGeradora } from "../../services/usinas.service";
import * as CarteiraService from "../../services/carteira.service";
import {
  marcarCarteiraComoVista,
  verificarNovoRecebimento,
} from "../../services/carteira-notificacoes.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import {
  AppHeader,
  ElasticScrollView as ScrollView,
  EmptyState,
  Loading,
  Metric,
  Screen,
  Section,
} from "../ui";
import QuickAccessCarousel from "../QuickAccessCarousel";
import RevenueChart from "./RevenueChart";

const APP_GERADOR_URL =
  "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk";
const APP_CONSUMIDOR_URL =
  "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-consumidor.apk";

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

const atalhos = [
  { icon: "card-outline", label: "Minha assinatura", rota: "/assinatura" },
  { icon: "people-outline", label: "Clientes", rota: "/clientes" },
  { icon: "business-outline", label: "Usinas", rota: "/usinas" },
  { icon: "flash-outline", label: "Unidades consumidoras", rota: "/unidades" },
  { icon: "receipt-outline", label: "Faturas", rota: "/faturas" },
  { icon: "document-text-outline", label: "Contratos", rota: "/contratos" },
] as const;

export default function DashboardGestor() {
  const { usuario, usinaSelecionada, suspenderBloqueioTemporariamente } =
    useAuth();
  const { data, isLoading, error, refetch } = useDashboardGestor();
  const [carteira, setCarteira] = useState<CarteiraService.Carteira | null>(
    null,
  );
  const [novoRecebimento, setNovoRecebimento] = useState(false);
  const [importando, setImportando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
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

  if (isLoading) return <Loading />;
  if (error || !data)
    return (
      <Screen>
        <View style={styles.errorContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar a usina"
            subtitle="Verifique sua conexão e tente novamente."
          />
        </View>
      </Screen>
    );

  return (
    <Screen>
      <AppHeader
        contextSubtitle={`Competência ${data.competencia}`}
        contextTitle="Visão geral da operação"
        icon="sunny-outline"
        subtitle="Sua energia em um só lugar"
        title="Início"
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
        <Section title="Acesso rápido">
          <QuickAccessCarousel
            items={[
              {
                icon: "wallet-outline",
                label: "Saldo em carteira",
                value: carteira
                  ? formatarMoeda(carteira.saldoDisponivel)
                  : "Carregando...",
                badge: novoRecebimento,
                onPress: () => void abrirCarteira(),
              },
              ...atalhos.map((atalho) => ({
                icon: atalho.icon,
                label: atalho.label,
                onPress: () => router.push(atalho.rota as any),
              })),
              {
                icon: "download-outline",
                label: "App Gerador",
                value: "Baixar Android",
                onPress: () => void Linking.openURL(APP_GERADOR_URL),
              },
              {
                icon: "phone-portrait-outline",
                label: "App Consumidor",
                value: "Baixar Android",
                onPress: () => void Linking.openURL(APP_CONSUMIDOR_URL),
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
            </View>
            <View style={styles.generationIcon}>
              <Ionicons name="sunny" size={27} color="#F6CC32" />
            </View>
          </View>
          <View style={styles.generationFooter}>
            <Text style={styles.generationFooterText}>
              {formatarPercentual(data.ocupacao)} alocada
            </Text>
            <Text style={styles.generationFooterText}>
              {formatarEnergia(data.energiaDisponivel)} disponíveis
            </Text>
          </View>
        </View>

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
                  Saldo disponível para transferência
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

        <Section title="Visão geral">
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
        </Section>

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
              <Text style={styles.allocationLabel}>prontos para alocação</Text>
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
          <Pressable
            disabled={importando}
            onPress={atualizarGeracao}
            style={[styles.importButton, importando && styles.disabled]}
          >
            <Ionicons
              name="document-attach-outline"
              size={18}
              color={Colors.surface}
            />
            <Text style={styles.importText}>
              {importando ? "Lendo conta..." : "Importar dados de produção"}
            </Text>
          </Pressable>
        </View>

        <RevenueChart
          previsto={data.receitaPrevista}
          recebido={data.receitaRealizada}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  errorContent: { flex: 1, justifyContent: "center", padding: Spacing.lg },
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
  importButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  importText: {
    marginLeft: Spacing.xs,
    color: Colors.surface,
    fontSize: Typography.caption,
    fontWeight: "800",
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  metric: { width: "48%" },
});
