import {
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDashboard } from "../../hooks/useDashboard";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { isAxiosError } from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useEmpresa } from "../../contexts/EmpresaContext";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import Screen from "../ui/Screen";
import { ElasticScrollView as ScrollView } from "../ui/ElasticScroll";

import ClienteHeader from "./ClienteHeader";
import EconomiaChart from "./EconomiaChart";
import EnergyFlowCard from "./EnergyFlowCard";
import QuickAccessCarousel from "../QuickAccessCarousel";
import { buscarCliente, listarMinhasUnidades } from "../../services/clientes.service";
import { obterRecebimentoFaturas } from "../../services/recebimento-faturas.service";

export default function ClienteHome() {
  const { logout, user, unidadeSelecionada } = useAuth();
  const { empresa } = useEmpresa();
  const { data, isLoading, error, refetch } = useDashboard();
  const [atualizando, setAtualizando] = useState(false);
  const [recebimentoObrigatorio, setRecebimentoObrigatorio] = useState(false);
  const [recebimentoAtivo, setRecebimentoAtivo] = useState(false);
  const [unidadeRecebimentoId, setUnidadeRecebimentoId] = useState("");
  const [concessionariaDaUnidade, setConcessionariaDaUnidade] = useState("");

  useEffect(() => {
    const clienteId = String(user?.cliente_id ?? "");
    if (!clienteId) return;
    Promise.all([buscarCliente(clienteId), listarMinhasUnidades()])
      .then(async ([cliente, unidades]: any[]) => {
        const unidadeAtual = unidades?.find(
          (unidade: any) => String(unidade.id) === String(unidadeSelecionada?.id ?? ""),
        ) ?? unidades?.[0];
        const usinaAtual = Array.isArray(unidadeAtual?.usinas) ? unidadeAtual.usinas[0] : unidadeAtual?.usinas;
        const titularidadeDoCliente = usinaAtual?.titularidade_ucs_recebedoras === "CLIENTE";
        setRecebimentoObrigatorio(titularidadeDoCliente);
        const unidadeId = String(unidadeSelecionada?.id ?? unidadeAtual?.id ?? "");
        setConcessionariaDaUnidade(
          String(unidadeSelecionada?.distribuidora ?? unidadeAtual?.distribuidora ?? "").trim(),
        );
        setUnidadeRecebimentoId(unidadeId);
        if (titularidadeDoCliente && unidadeId) {
          const status = await obterRecebimentoFaturas(unidadeId);
          setRecebimentoAtivo(Boolean(status.ativo));
        } else {
          setRecebimentoAtivo(false);
        }
      })
      .catch(() => undefined);
  }, [unidadeSelecionada?.id, user?.cliente_id]);
  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }

  if (isLoading) return <Loading />;

  if (error || !data) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const mensagem = status === 401
      ? "Sua sessão expirou. Entre novamente na conta."
      : status === 403 || status === 404
        ? "Selecione novamente uma unidade vinculada à sua conta."
        : isAxiosError(error)
          ? `Não conseguimos consultar o servidor${status ? ` (HTTP ${status})` : ""}. Tente novamente.`
          : error?.message ?? "Selecione sua unidade consumidora para continuar.";
    return (
      <Screen>
        <View style={styles.errorContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar a sua energia"
            subtitle={mensagem}
          />
          <Button title={atualizando ? "Carregando…" : "Tentar novamente"} disabled={atualizando} onPress={atualizarPagina} style={{ marginTop: Spacing.md }} />
          <Button title="Escolher unidade consumidora" onPress={() => router.replace("/selecionar-unidade")} style={{ marginTop: Spacing.md }} />
          {status === 401 ? <Button title="Entrar novamente" onPress={() => { void logout(); }} style={{ marginTop: Spacing.md }} /> : null}
        </View>
      </Screen>
    );
  }

  const quantidadeEmAberto = Number(data.faturasEmAberto ?? 0);
  const valorEmAberto = Number(data.valorEmAberto ?? 0);
  const consumo = Number(data.consumo ?? 0);
  const creditos = Number(data.creditos ?? 0);
  const economiaMes = Number(data.economiaMes ?? 0);
  const economiaAcumulada = Number(data.economiaAcumulada ?? 0);
  const compensacao =
    consumo > 0 ? Math.min(100, Math.round((creditos / consumo) * 100)) : 0;
  const moeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const energia = (valor: number) =>
    `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
  const concessionariaVigente = String(
    unidadeSelecionada?.distribuidora ?? concessionariaDaUnidade ?? data.distribuidora ?? "",
  ).trim();
  const nomeEmpresa = String(empresa.nome || "Andrade Energy").trim();
  const nomeFaturaConcessionaria = concessionariaVigente
    ? `Fatura ${concessionariaVigente}`
    : "Fatura da concessionária";
  const nomeEnvioAutomatico = concessionariaVigente
    ? `Envio automático de fatura ${concessionariaVigente}`
    : "Envio automático de fatura da concessionária";

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <StatusBar backgroundColor="#006B3C" barStyle="light-content" />
      <ClienteHeader
        cliente={data.cliente}
        uc={data.uc}
        distribuidora={concessionariaVigente}
        onOpenProfile={() => router.navigate("/perfil")}
        onSearch={() => router.push({ pathname: "/pesquisa", params: { perfil: "consumidor" } } as any)}
      />

      <ScrollView
        style={styles.scroll}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarPagina}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.overviewHero}>
          <View style={styles.overviewCopy}>
            <Text style={styles.overviewEyebrow}>ECONOMIA ACUMULADA</Text>
            <Text style={styles.overviewValue}>{moeda(economiaAcumulada)}</Text>
            <Text style={styles.overviewCaption}>
              Sua energia gerando valor desde o início do contrato
            </Text>
            <View style={styles.monthSaving}>
              <Ionicons name="trending-up-outline" size={17} color="#A7F3D0" />
              <Text style={styles.monthSavingText}>
                {moeda(economiaMes)} nesta competência
              </Text>
            </View>
          </View>
          <View style={styles.compensationOrbit}>
            <Text style={styles.compensationValue}>{compensacao}%</Text>
            <Text style={styles.compensationLabel}>compensado</Text>
          </View>
        </View>

        <View style={styles.quickHeader}>
          <Text style={styles.quickTitle}>Acesso rápido</Text>
          <Text style={styles.quickHint}>Arraste para navegar</Text>
        </View>
        {recebimentoObrigatorio && !recebimentoAtivo ? <TouchableOpacity activeOpacity={0.84} onPress={() => unidadeRecebimentoId ? router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidadeRecebimentoId } }) : router.push("/selecionar-unidade")} style={styles.requiredEmailCard}><View style={styles.requiredEmailIcon}><Ionicons name="alert-circle-outline" size={23} color="#9A5B00" /></View><View style={styles.requiredEmailCopy}><Text style={styles.requiredEmailTitle}>Ativação obrigatória</Text><Text style={styles.requiredEmailText}>Conecte seu e-mail para que as próximas faturas sejam recebidas e processadas automaticamente.</Text></View><Ionicons name="chevron-forward" size={20} color="#9A5B00" /></TouchableOpacity> : null}
        <QuickAccessCarousel
          storageKey="consumidor-home"
          items={[
            {
              icon: "receipt-outline",
              label: `Faturas ${nomeEmpresa}`,
              onPress: () => router.push("/faturas"),
            },
            {
              icon: "document-attach-outline",
              label: nomeFaturaConcessionaria,
              onPress: () => router.push("/contas-de-luz"),
            },
            {
              icon: "cloud-upload-outline",
              label: `Anexar ${nomeFaturaConcessionaria.toLowerCase()}`,
              onPress: () => {
                const clienteId = String(user?.cliente_id ?? "");
                if (!clienteId) {
                  router.push("/perfil");
                  return;
                }
                router.push({ pathname: "/clientes/faturas-anexadas" as never, params: { clienteId } });
              },
            },
            ...(recebimentoObrigatorio ? [{
              icon: "mail-unread-outline" as const,
              label: nomeEnvioAutomatico,
              onPress: () => unidadeRecebimentoId
                ? router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidadeRecebimentoId } })
                : router.push("/selecionar-unidade"),
            }] : []),
            {
              icon: "trending-up-outline",
              label: "Economia",
              onPress: () => router.push("/(tabs)/economia"),
            },
            {
              icon: "document-text-outline",
              label: "Contrato",
              onPress: () => router.push("/contrato"),
            },
          ]}
        />

        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>Visão geral</Text>
          <Text style={styles.overviewHint}>Competência atual</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="flash-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Consumo</Text>
            <Text style={styles.metricValue}>{energia(consumo)}</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="sunny-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Créditos recebidos</Text>
            <Text style={styles.metricValue}>{energia(creditos)}</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="home-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Minha unidade</Text>
            <Text numberOfLines={1} style={styles.metricValue}>
              {String(data.uc ?? "—")}
            </Text>
            <Text numberOfLines={1} style={styles.metricNote}>
              {concessionariaVigente || "Concessionária"}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/faturas")}
            style={styles.metricCard}
          >
            <View style={styles.metricIcon}>
              <Ionicons
                name="receipt-outline"
                size={19}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.metricLabel}>Faturas pendentes</Text>
            <Text style={styles.metricValue}>{quantidadeEmAberto}</Text>
            <Text style={styles.metricNote}>{moeda(valorEmAberto)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.invoiceSectionHeader}>
          <Text style={styles.invoiceSectionTitle}>Faturas pendentes</Text>
          <TouchableOpacity onPress={() => router.push("/faturas")}>
            <Text style={styles.invoiceSeeAll}>VER TODOS</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityLabel="Abrir faturas pendentes"
          activeOpacity={0.86}
          onPress={() => {
            const faturaId = data.ultimaFatura?.id;
            router.push(
              faturaId && quantidadeEmAberto > 0
                ? `/faturas/${faturaId}`
                : "/faturas/pagamento",
            );
          }}
        >
          <Card>
            <View style={styles.emptyInvoiceHeader}>
              <View style={styles.emptyInvoiceIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.emptyInvoiceContent}>
                <Text style={styles.emptyInvoiceEyebrow}>PENDÊNCIAS</Text>
                <Text style={styles.emptyInvoiceTitle}>
                  {quantidadeEmAberto}{" "}
                  {quantidadeEmAberto === 1 ? "fatura" : "faturas"}
                </Text>
              </View>
              <Text style={styles.emptyInvoiceValue}>
                {valorEmAberto.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
            <Text style={styles.emptyInvoiceHint}>
              {quantidadeEmAberto > 0
                ? "Consulte vencimentos, pagamentos e documentos disponíveis."
                : "Você não possui faturas pendentes no momento."}
            </Text>
          </Card>
        </TouchableOpacity>

        <EnergyFlowCard
          injecao={data.ultimaFatura?.energiaInjetada ?? 0}
          compensacao={data.ultimaFatura?.energiaCompensada ?? 0}
          economiaMes={data.economiaMes}
          economiaAcumulada={data.economiaAcumulada}
        />

        <EconomiaChart
          historico={Array.isArray(data.historico) ? data.historico : []}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  errorContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  overviewHero: {
    minHeight: 188,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#063E31",
    ...Shadows.card,
  },
  overviewCopy: { flex: 1, paddingRight: Spacing.sm },
  overviewEyebrow: {
    color: "#86EFAC",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  overviewValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  overviewCaption: {
    marginTop: 4,
    color: "#CDEBDE",
    fontSize: Typography.small,
    lineHeight: 18,
  },
  monthSaving: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: Spacing.md,
  },
  monthSavingText: { color: "#A7F3D0", fontSize: 11, fontWeight: "800" },
  requiredEmailCard: { minHeight: 78, flexDirection: "row", alignItems: "center", marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: "#F3C66B", borderRadius: Radius.lg, backgroundColor: "#FFF8E8" }, requiredEmailIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: "#FFE8B2" }, requiredEmailCopy: { flex: 1, marginHorizontal: Spacing.sm }, requiredEmailTitle: { color: "#704000", fontSize: Typography.small, fontWeight: "900" }, requiredEmailText: { marginTop: 3, color: "#825B1E", fontSize: 11, lineHeight: 16 },
  compensationOrbit: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "#22C979",
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,.07)",
  },
  compensationValue: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  compensationLabel: {
    marginTop: 1,
    color: "#BDEBD5",
    fontSize: 9,
    fontWeight: "700",
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  overviewTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  overviewHint: { color: Colors.subtitle, fontSize: 11, fontWeight: "600" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    width: "48%",
    minHeight: 128,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  metricIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  metricLabel: {
    marginTop: Spacing.sm,
    color: Colors.subtitle,
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  metricNote: {
    marginTop: 3,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  quickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  quickHint: { color: Colors.subtitle, fontSize: 11, fontWeight: "600" },
  invoiceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  invoiceSectionTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  invoiceSeeAll: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  emptyInvoiceHeader: { flexDirection: "row", alignItems: "center" },
  emptyInvoiceIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  emptyInvoiceContent: { flex: 1, marginLeft: Spacing.sm },
  emptyInvoiceEyebrow: {
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  emptyInvoiceTitle: {
    marginTop: 3,
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyInvoiceValue: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  emptyInvoiceHint: {
    marginTop: Spacing.md,
    color: Colors.subtitle,
    fontSize: 12,
    lineHeight: 18,
  },
});
