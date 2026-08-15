import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState, Loading, Screen } from "../../components/ui";
import { useFaturas } from "../../hooks/useFaturas";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Categoria = "cemig" | "unificada";
type Filtro = "todas" | "pendentes" | "pagas";

const normalizarStatus = (status?: string) => String(status ?? "").trim().toUpperCase();
const estaPaga = (status?: string) => ["PAGA", "PAGO", "QUITADA"].includes(normalizarStatus(status));
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Faturas() {
  const { data, isLoading, error } = useFaturas();
  const [categoria, setCategoria] = useState<Categoria>("cemig");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const faturas = useMemo(() => data ?? [], [data]);

  const lista = useMemo(() => faturas.filter((item: any) => {
    if (filtro === "pagas") return estaPaga(item.status);
    if (filtro === "pendentes") return !estaPaga(item.status);
    return true;
  }), [faturas, filtro]);

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

          <View style={styles.categoryTabs}>
            <CategoryButton active={categoria === "cemig"} icon="flash-outline" label="CEMIG" onPress={() => setCategoria("cemig")} />
            <CategoryButton active={categoria === "unificada"} icon="documents-outline" label="Unificadas" onPress={() => setCategoria("unificada")} />
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
            subtitle={error ? "Confira sua conexão e tente novamente." : `Nenhuma fatura ${categoria === "cemig" ? "CEMIG" : "unificada"} encontrada neste filtro.`}
          />
        </View>}
        renderItem={({ item }) => {
          const paga = estaPaga(item.status);
          const valor = categoria === "cemig" ? item.valor_cemig ?? item.valor_total : item.valor_total_unificado ?? item.valor_total;
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
                <View style={styles.documentType}><Text style={styles.documentLabel}>{categoria === "cemig" ? "FATURA CEMIG" : "FATURA UNIFICADA"}</Text><Text numberOfLines={1} style={styles.documentCode}>{item.numero_instalacao || item.id}</Text></View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

function CategoryButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.categoryButton, active && styles.categoryButtonActive]}><Ionicons name={icon} size={17} color={active ? Colors.surface : Colors.subtitle} /><Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{label}</Text></TouchableOpacity>;
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}><Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs },
  title: { color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
  categoryTabs: { flexDirection: "row", gap: Spacing.xs, marginBottom: Spacing.md, padding: 4, borderRadius: Radius.lg, backgroundColor: "#D6D8DC" },
  categoryButton: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: Radius.md },
  categoryButtonActive: { backgroundColor: Colors.primary },
  categoryLabel: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "800" },
  categoryLabelActive: { color: Colors.surface },
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
});
