import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, Loading, Screen } from "../../components/ui";
import { useFaturas } from "../../hooks/useFaturas";
import { excluirFatura } from "../../services/faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Filtro = "todas" | "pendentes" | "pagas";

const normalizarStatus = (status?: string) => String(status ?? "").trim().toUpperCase();
const estaPaga = (status?: string) => ["PAGA", "PAGO", "QUITADA"].includes(normalizarStatus(status));
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Faturas() {
  const { data, isLoading, error, refetch } = useFaturas();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const faturas = useMemo(() => data ?? [], [data]);

  const lista = useMemo(() => faturas.filter((item: any) => {
    if (filtro === "pagas") return estaPaga(item.status);
    if (filtro === "pendentes") return !estaPaga(item.status);
    return true;
  }), [faturas, filtro]);

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

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.content}
        data={lista}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <View style={styles.heading}>
            <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
              <Ionicons name="chevron-back" size={23} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Faturas</Text>
          </View>

          <View style={styles.filterTabs}>
            <FilterButton active={filtro === "todas"} label="Todas" onPress={() => setFiltro("todas")} />
            <FilterButton active={filtro === "pendentes"} label="Pendentes" onPress={() => setFiltro("pendentes")} />
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
          const paga = estaPaga(item.status);
          const valor = item.valor_total_unificado ?? item.valor_total;
          return (
            <TouchableOpacity
              accessibilityLabel={`Abrir fatura ${item.referencia}`}
              activeOpacity={0.84}
              onPress={() => router.push(`/faturas/${item.id}`)}
              style={styles.invoiceCard}
            >
              <View style={styles.invoiceTop}>
                <View><Text style={styles.value}>{moeda(valor)}</Text><Text style={styles.reference}>{item.referencia || "Período não informado"}</Text></View>
                <View style={[styles.status, paga ? styles.statusPaid : styles.statusOpen]}><Text style={styles.statusText}>{paga ? "Paga" : "Em aberto"}</Text></View>
              </View>
              <View style={styles.invoiceDivider} />
              <View style={styles.invoiceBottom}>
                <View><Text style={styles.metaLabel}>{paga ? "PAGAMENTO" : "VENCIMENTO"}</Text><Text style={styles.metaValue}>{paga ? item.data_pagamento || "Confirmado" : item.vencimento || "Não informado"}</Text></View>
                <View style={styles.documentType}><Text style={styles.documentLabel}>FATURA ANDRADE ENERGY</Text><Text numberOfLines={1} style={styles.documentCode}>{item.numero_instalacao || item.id}</Text></View>
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

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs },
  title: { color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
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
  statusText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "800" },
  invoiceDivider: { height: 1, marginVertical: Spacing.md, backgroundColor: "rgba(100,116,139,0.20)" },
  invoiceBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  metaLabel: { color: Colors.subtitle, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  metaValue: { marginTop: 4, color: Colors.text, fontSize: Typography.small, fontWeight: "700" },
  documentType: { maxWidth: "48%", alignItems: "flex-end" },
  documentLabel: { color: Colors.text, fontSize: 9, fontWeight: "900" },
  documentCode: { marginTop: 4, color: Colors.subtitle, fontSize: 9 },
  deleteInvoice: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(100,116,139,0.20)" },
  deleteInvoiceText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "800" },
});
