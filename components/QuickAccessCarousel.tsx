import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView as NativeScrollView, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { Colors, Radius, Spacing, Typography } from "../theme";

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: boolean;
  value?: string;
};

type Props = {
  items: Item[];
  storageKey?: string;
};

export default function QuickAccessCarousel({ items, storageKey = "geral" }: Props) {
  const [ultimoUsado, setUltimoUsado] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[] | null>(null);
  const [personalizando, setPersonalizando] = useState(false);
  const chave = `andrade.quick-access.${storageKey}.v1`;
  const chaveSelecao = `andrade.quick-access.${storageKey}.selection.v1`;

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(chave).then((valor) => {
      if (ativo) setUltimoUsado(valor);
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, [chave]);

  useEffect(() => {
    let ativo = true;
    setSelecionados(null);
    AsyncStorage.getItem(chaveSelecao).then((valor) => {
      if (!ativo || !valor) return;
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) setSelecionados(parsed.filter((item): item is string => typeof item === "string"));
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, [chaveSelecao]);

  const disponiveis = useMemo(() => items.map((item) => item.label), [items]);
  const ativos = selecionados === null ? disponiveis : selecionados.filter((label) => disponiveis.includes(label));

  const itensOrdenados = useMemo(() => {
    const visiveis = ativos.map((label) => items.find((item) => item.label === label)).filter((item): item is Item => Boolean(item));
    if (selecionados !== null || !ultimoUsado) return visiveis;
    const indice = visiveis.findIndex((item) => item.label === ultimoUsado);
    if (indice <= 0) return visiveis;
    return [visiveis[indice], ...visiveis.slice(0, indice), ...visiveis.slice(indice + 1)];
  }, [items, ativos, selecionados, ultimoUsado]);
  const opcoesOrdenadas = [
    ...ativos.map((label) => items.find((item) => item.label === label)).filter((item): item is Item => Boolean(item)),
    ...items.filter((item) => !ativos.includes(item.label)),
  ];

  function salvarSelecao(proxima: string[]) {
    setSelecionados(proxima);
    void AsyncStorage.setItem(chaveSelecao, JSON.stringify(proxima)).catch(() => undefined);
  }

  function alternar(label: string) {
    salvarSelecao(ativos.includes(label) ? ativos.filter((item) => item !== label) : [...ativos, label]);
  }

  function mover(label: string, direcao: -1 | 1) {
    const indice = ativos.indexOf(label);
    const destino = indice + direcao;
    if (indice < 0 || destino < 0 || destino >= ativos.length) return;
    const proxima = [...ativos];
    [proxima[indice], proxima[destino]] = [proxima[destino], proxima[indice]];
    salvarSelecao(proxima);
  }

  function abrir(item: Item) {
    setUltimoUsado(item.label);
    void AsyncStorage.setItem(chave, item.label).catch(() => undefined);
    item.onPress();
  }

  return (<>
    <ScrollView
      horizontal
      alwaysBounceHorizontal={false}
      bounces={false}
      decelerationRate="fast"
      directionalLockEnabled
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {itensOrdenados.map((item) => (
        <Pressable accessibilityLabel={item.label} key={item.label} onPress={() => abrir(item)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
          {item.badge ? <View style={styles.badge}><Text style={styles.badgeText}>NOVO</Text></View> : null}
          <View style={styles.icon}><Ionicons name={item.icon} size={27} color="#FFFFFF" /></View>
          <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
          {item.value ? <Text numberOfLines={1} style={styles.value}>{item.value}</Text> : null}
        </Pressable>
      ))}
      <Pressable accessibilityLabel="Personalizar acesso rápido" onPress={() => setPersonalizando(true)} style={styles.card}>
        <View style={[styles.icon, styles.editIcon]}><Ionicons name="options-outline" size={27} color={Colors.primary} /></View>
        <Text numberOfLines={2} style={styles.label}>Personalizar</Text>
      </Pressable>
    </ScrollView>
    <Modal visible={personalizando} transparent animationType="slide" onRequestClose={() => setPersonalizando(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Personalizar acesso rápido</Text>
          <Text style={styles.sheetHint}>Escolha os atalhos deste ambiente. Use as setas para mudar a ordem.</Text>
          <NativeScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {opcoesOrdenadas.map((item) => {
              const marcado = ativos.includes(item.label);
              return <View key={item.label} style={styles.option}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: marcado }} onPress={() => alternar(item.label)} style={styles.optionMain}>
                  <Ionicons name={marcado ? "checkbox" : "square-outline"} size={23} color={Colors.primary} />
                  <Text style={styles.optionLabel}>{item.label}</Text>
                </Pressable>
                {marcado ? <>
                  <Pressable accessibilityLabel={`Mover ${item.label} para cima`} accessibilityRole="button" disabled={ativos.indexOf(item.label) === 0} onPress={() => mover(item.label, -1)} style={styles.moveButton}><Ionicons name="chevron-up" size={22} color={ativos.indexOf(item.label) === 0 ? Colors.border : Colors.primary} /></Pressable>
                  <Pressable accessibilityLabel={`Mover ${item.label} para baixo`} accessibilityRole="button" disabled={ativos.indexOf(item.label) === ativos.length - 1} onPress={() => mover(item.label, 1)} style={styles.moveButton}><Ionicons name="chevron-down" size={22} color={ativos.indexOf(item.label) === ativos.length - 1 ? Colors.border : Colors.primary} /></Pressable>
                </> : null}
              </View>;
            })}
          </NativeScrollView>
          <Pressable onPress={() => { setSelecionados(null); void AsyncStorage.removeItem(chaveSelecao).catch(() => undefined); }} style={styles.restore}><Text style={styles.restoreText}>Restaurar padrão</Text></Pressable>
          <Pressable onPress={() => setPersonalizando(false)} style={styles.done}><Text style={styles.doneText}>Concluir</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -Spacing.lg },
  content: { gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 3 },
  card: { width: 86, minHeight: 104, alignItems: "center", justifyContent: "flex-start", paddingTop: 2 },
  cardPressed: { opacity: 0.68, transform: [{ scale: 0.96 }] },
  badge: { position: "absolute", top: -2, right: 1, zIndex: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.round, backgroundColor: "#E11D48" },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  icon: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, backgroundColor: Colors.primary, shadowColor: Colors.primaryDark, shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  label: { marginTop: 8, color: Colors.text, fontSize: 11, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  value: { marginTop: 2, color: Colors.primary, fontSize: 11, fontWeight: "800" },
  editIcon: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "80%", padding: Spacing.lg, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, backgroundColor: Colors.surface },
  sheetTitle: { color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
  sheetHint: { color: Colors.subtitle, marginTop: Spacing.xs, marginBottom: Spacing.md },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: Spacing.sm },
  option: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  optionLabel: { flex: 1, color: Colors.text, fontWeight: "600" },
  moveButton: { width: 38, height: 42, alignItems: "center", justifyContent: "center" },
  restore: { alignItems: "center", padding: Spacing.md },
  restoreText: { color: Colors.primary, fontWeight: "700" },
  done: { alignItems: "center", padding: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.primary },
  doneText: { color: "#FFF", fontWeight: "800" },
});
