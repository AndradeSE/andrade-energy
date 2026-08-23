import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Card, ElasticFlatList as FlatList, EmptyState, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useFaturas } from "../../hooks/useFaturas";
import { excluirFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { formatarDataBrasileira } from "../../utils/date";

type Filtro = "todas" | "abertas" | "vencidas" | "pagas";

const normalizarStatus = (status?: string) => String(status ?? "").trim().toUpperCase();
const estaPaga = (status?: string) => ["PAGA", "PAGO", "QUITADA"].includes(normalizarStatus(status));
const statusEfetivo = (item: any) => item.cobrancas?.[0]?.status ?? item.status;
const estaVencida = (item: any) => !estaPaga(statusEfetivo(item)) && Boolean(item.vencimento) && new Date(`${item.vencimento}T23:59:59`) < new Date();
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Faturas() {
  const proprietario = IS_GERADOR_APP;
  const { data, isLoading, error, refetch } = useFaturas();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [baixando, setBaixando] = useState<string>();
  const [atualizando, setAtualizando] = useState(false);
  const faturas = useMemo(() => data ?? [], [data]);

  const lista = useMemo(() => faturas.filter((item: any) => {
    if (filtro === "pagas") return estaPaga(statusEfetivo(item));
    if (filtro === "abertas") return !estaPaga(statusEfetivo(item)) && !estaVencida(item);
    if (filtro === "vencidas") return estaVencida(item);
    return true;
  }), [faturas, filtro]);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }

  const confirmarExclusao = (item: any) => {
    Alert.alert(
      "Excluir fatura",
      `Deseja excluir definitivamente a fatura ${item.referencia || "selecionada"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirFatura(item.id);
              await refetch();
            } catch (erro: any) {
              Alert.alert("Não foi possível excluir", erro?.message || "Tente novamente.");
            }
          },
        },
      ],
    );
  };

  async function baixarDocumento(url: string | undefined, nome: string, chave: string) {
    if (!url) return;
    try {
      setBaixando(chave);
      if (Platform.OS === "web") return await Linking.openURL(url);
      const arquivo = await File.downloadFileAsync(url, new File(Paths.document, nome), { idempotent: true });
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystemLegacy.getContentUriAsync(arquivo.uri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/pdf" });
          return;
        } catch { /* Abre pelo compartilhamento se não houver visualizador padrão. */ }
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(arquivo.uri, { dialogTitle: "Abrir ou salvar fatura", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      else Alert.alert("Download concluído", "A fatura foi salva no aplicativo.");
    } catch {
      Alert.alert("Não foi possível baixar", "Confira sua conexão e tente novamente.");
    } finally { setBaixando(undefined); }
  }

  if (isLoading) return <Loading />;

  return (
    <Screen>
      {proprietario ? <AppHeader title="Faturas" subtitle="Todos os clientes" contextTitle={`${faturas.length} faturas cadastradas`} contextSubtitle="Abertas, vencidas e pagas" icon="receipt-outline" /> : null}
      <FlatList
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        contentContainerStyle={styles.content}
        data={lista}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <View style={styles.heading}>
            {!proprietario ? <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
              <Ionicons name="chevron-back" size={23} color={Colors.text} />
            </TouchableOpacity> : null}
            <View><Text style={styles.title}>{proprietario ? "Todas as faturas" : "Faturas"}</Text>{proprietario ? <Text style={styles.subtitle}>Acompanhe as cobranças de toda a carteira.</Text> : null}</View>
          </View>

          {!proprietario ? <Card style={styles.autoReceiveCard}>
            <View style={styles.autoReceiveIcon}>
              <Ionicons name="mail-unread-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.autoReceiveCopy}>
              <Text style={styles.autoReceiveTitle}>Receba sua conta automaticamente</Text>
              <Text style={styles.autoReceiveText}>Conecte ou encaminhe o e-mail da concessionária para agilizar seu faturamento.</Text>
            </View>
            <Button
              title="Configurar recebimento"
              icon={<Ionicons name="arrow-forward" size={19} color={Colors.surface} />}
              onPress={() => router.push("/unidades/recebimento-email")}
              style={styles.autoReceiveButton}
            />
          </Card> : null}

          <View style={styles.filterTabs}>
            <FilterButton active={filtro === "todas"} label="Todas" onPress={() => setFiltro("todas")} />
            <FilterButton active={filtro === "abertas"} label="Abertas" onPress={() => setFiltro("abertas")} />
            <FilterButton active={filtro === "vencidas"} label="Vencidas" onPress={() => setFiltro("vencidas")} />
            <FilterButton active={filtro === "pagas"} label="Pagas" onPress={() => setFiltro("pagas")} />
          </View>
        </>}
        ListEmptyComponent={<View style={styles.empty}>
          <EmptyState
            icon={error ? "alert-circle-outline" : "receipt-outline"}
            title={error ? "Não foi possível carregar as faturas" : `0 faturas ${filtro === "todas" ? "" : filtro}`.trim()}
            subtitle={error ? "Confira sua conexão e tente novamente." : "Nenhuma fatura Andrade Energy encontrada neste filtro."}
          />
        </View>}
        renderItem={({ item }) => {
          const paga = estaPaga(statusEfetivo(item));
          const vencida = estaVencida(item);
          const valor = item.valor_total_unificado ?? item.valor_total;
          const referenciaArquivo = String(item.referencia ?? item.id).replace(/[^a-zA-Z0-9_-]/g, "-");
          return (
            <TouchableOpacity
              accessibilityLabel={`Abrir fatura ${item.referencia}`}
              activeOpacity={0.84}
              onPress={() => router.push(`/faturas/${item.id}`)}
              style={styles.invoiceCard}
            >
              <View style={styles.invoiceTop}>
                <View><Text style={styles.value}>{moeda(valor)}</Text><Text style={styles.reference}>{item.referencia || "Período não informado"}</Text></View>
                <View style={[styles.status, paga ? styles.statusPaid : vencida ? styles.statusOverdue : styles.statusOpen]}><Text style={styles.statusText}>{paga ? "Paga" : vencida ? "Vencida" : "Em aberto"}</Text></View>
              </View>
              {proprietario ? <View style={styles.customer}><Ionicons name="person-outline" size={15} color={Colors.primary} /><Text numberOfLines={1} style={styles.customerText}>{item.clientes?.nome || "Cliente não identificado"}</Text></View> : null}
              <View style={styles.invoiceDivider} />
              <View style={styles.invoiceBottom}>
                <View><Text style={styles.metaLabel}>{paga ? "PAGAMENTO" : "VENCIMENTO"}</Text><Text style={styles.metaValue}>{paga ? formatarDataBrasileira(item.cobrancas?.[0]?.pago_em || item.data_pagamento, "Confirmado") : formatarDataBrasileira(item.vencimento)}</Text></View>
                <View style={styles.documentType}><Text style={styles.documentLabel}>FATURA ANDRADE ENERGY</Text><Text numberOfLines={1} style={styles.documentCode}>{item.numero_instalacao || item.id}</Text></View>
              </View>
              <View style={styles.downloads}>
                <DownloadLink label="Concessionária" available={Boolean(item.pdf_cemig_url)} loading={baixando === `cemig-${item.id}`} onPress={() => baixarDocumento(item.pdf_cemig_url, `concessionaria-${referenciaArquivo}.pdf`, `cemig-${item.id}`)} />
                <DownloadLink label="Unificada" available={Boolean(item.pdf_unificada_url)} loading={baixando === `unificada-${item.id}`} onPress={() => baixarDocumento(item.pdf_unificada_url, `unificada-${referenciaArquivo}.pdf`, `unificada-${item.id}`)} />
              </View>
              <TouchableOpacity
                accessibilityLabel={`Excluir fatura ${item.referencia || ""}`}
                onPress={(event) => {
                  event.stopPropagation();
                  confirmarExclusao(item);
                }}
                style={styles.deleteInvoice}
              >
                <Ionicons name="trash-outline" size={17} color={Colors.danger} />
                <Text style={styles.deleteInvoiceText}>Excluir fatura</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}><Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text></TouchableOpacity>;
}

function DownloadLink({ available, label, loading, onPress }: { available: boolean; label: string; loading: boolean; onPress: () => void }) {
  return <TouchableOpacity disabled={!available || loading} onPress={(event) => { event.stopPropagation(); onPress(); }} style={[styles.download, !available && styles.downloadUnavailable]}><Ionicons name={loading ? "hourglass-outline" : available ? "download-outline" : "time-outline"} size={17} color={available ? Colors.primary : Colors.subtitle} /><Text style={[styles.downloadText, !available && styles.downloadTextUnavailable]}>{loading ? "Baixando..." : label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs },
  title: { color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
  subtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  autoReceiveCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg, padding: Spacing.md, backgroundColor: "#E6F4EA" },
  autoReceiveIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.surface },
  autoReceiveCopy: { flex: 1, minWidth: 190 },
  autoReceiveTitle: { color: Colors.text, fontSize: Typography.caption, fontWeight: "900" },
  autoReceiveText: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 17 },
  autoReceiveButton: { width: "100%", height: 46, borderRadius: Radius.md },
  filterTabs: { flexDirection: "row", marginBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  filterButtonActive: { borderBottomColor: "#8F938D" },
  filterLabel: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" },
  filterLabelActive: { color: Colors.text, fontWeight: "900" },
  empty: { paddingTop: Spacing.xl },
  invoiceCard: { marginBottom: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: "#DEE0E3", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  invoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" },
  reference: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  status: { minWidth: 92, alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: Radius.round },
  statusOpen: { backgroundColor: "#F59E0B" },
  statusPaid: { backgroundColor: Colors.success },
  statusOverdue: { backgroundColor: Colors.danger },
  statusText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "800" },
  invoiceDivider: { height: 1, marginVertical: Spacing.md, backgroundColor: "rgba(100,116,139,0.20)" },
  customer: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: Spacing.sm }, customerText: { flex: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "700" },
  invoiceBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  metaLabel: { color: Colors.subtitle, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  metaValue: { marginTop: 4, color: Colors.text, fontSize: Typography.small, fontWeight: "700" },
  documentType: { maxWidth: "48%", alignItems: "flex-end" },
  documentLabel: { color: Colors.text, fontSize: 9, fontWeight: "900" },
  documentCode: { marginTop: 4, color: Colors.subtitle, fontSize: 9 },
  downloads: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }, download: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md }, downloadUnavailable: { borderColor: Colors.border, opacity: 0.58 }, downloadText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" }, downloadTextUnavailable: { color: Colors.subtitle },
  deleteInvoice: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(100,116,139,0.20)" },
  deleteInvoiceText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "800" },
});
