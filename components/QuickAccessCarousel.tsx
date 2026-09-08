import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const chave = `andrade.quick-access.${storageKey}.v1`;

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(chave).then((valor) => {
      if (ativo) setUltimoUsado(valor);
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, [chave]);

  const itensOrdenados = useMemo(() => {
    if (!ultimoUsado) return items;
    const indice = items.findIndex((item) => item.label === ultimoUsado);
    if (indice <= 0) return items;
    return [items[indice], ...items.slice(0, indice), ...items.slice(indice + 1)];
  }, [items, ultimoUsado]);

  function abrir(item: Item) {
    setUltimoUsado(item.label);
    void AsyncStorage.setItem(chave, item.label).catch(() => undefined);
    item.onPress();
  }

  return (
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
    </ScrollView>
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
});
