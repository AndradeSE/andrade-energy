import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type Usina = {
  id: string;
  nome?: string | null;
  numero_instalacao?: string | null;
};

type Props = {
  usinas: Usina[];
  value?: string | null;
  onChange: (usinaId: string) => void;
  label?: string;
  detail?: (usina: Usina) => string;
  placeholder?: string;
};

/** Um campo compacto que abre a lista de usinas apenas quando necessário. */
export default function UsinaSelector({
  usinas,
  value,
  onChange,
  label = "Usina geradora",
  detail,
  placeholder = "Toque para escolher a usina",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionada = useMemo(() => usinas.find((usina) => String(usina.id) === String(value ?? "")), [usinas, value]);

  function escolher(usina: Usina) {
    onChange(usina.id);
    setAberto(false);
  }

  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher usina geradora" onPress={() => setAberto(true)} style={styles.selector}>
      <View style={styles.selectorIcon}><Ionicons name="sunny-outline" size={20} color={Colors.primary} /></View>
      <View style={styles.selectorCopy}>
        <Text numberOfLines={1} style={[styles.selectorTitle, !selecionada && styles.placeholder]}>{selecionada?.nome ?? placeholder}</Text>
        {selecionada ? <Text numberOfLines={1} style={styles.selectorDetail}>{detail?.(selecionada) ?? (selecionada.numero_instalacao ? `UC ${selecionada.numero_instalacao}` : "Usina selecionada")}</Text> : null}
      </View>
      <Ionicons name="chevron-down" size={21} color={Colors.subtitle} />
    </Pressable>

    <Modal animationType="fade" transparent visible={aberto} onRequestClose={() => setAberto(false)}>
      <Pressable onPress={() => setAberto(false)} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>USINA GERADORA</Text>
              <Text style={styles.sheetTitle}>Escolha a usina da UC</Text>
            </View>
            <Pressable accessibilityLabel="Fechar lista de usinas" hitSlop={10} onPress={() => setAberto(false)} style={styles.close}>
              <Ionicons name="close" size={22} color={Colors.subtitle} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {usinas.map((usina) => {
              const ativa = String(usina.id) === String(value ?? "");
              return <Pressable key={usina.id} onPress={() => escolher(usina)} style={[styles.option, ativa && styles.optionSelected]}>
                <View style={[styles.optionIcon, ativa && styles.optionIconSelected]}><Ionicons name="sunny-outline" size={20} color={Colors.primary} /></View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionName}>{usina.nome ?? "Usina sem nome"}</Text>
                  <Text numberOfLines={2} style={styles.optionDetail}>{detail?.(usina) ?? (usina.numero_instalacao ? `UC ${usina.numero_instalacao}` : "Usina geradora")}</Text>
                </View>
                {ativa ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : <Ionicons name="chevron-forward" size={20} color={Colors.subtitle} />}
              </Pressable>;
            })}
            {!usinas.length ? <Text style={styles.empty}>Nenhuma usina disponível.</Text> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  selector: { minHeight: 62, flexDirection: "row", alignItems: "center", padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
  selectorIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  selectorCopy: { flex: 1, minWidth: 0, marginHorizontal: Spacing.sm },
  selectorTitle: { color: Colors.text, fontSize: Typography.caption, fontWeight: "800" },
  placeholder: { color: Colors.subtitle, fontWeight: "600" },
  selectorDetail: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "flex-end", padding: Spacing.md, backgroundColor: "rgba(15, 23, 42, 0.42)" },
  sheet: { width: "100%", maxHeight: "72%", overflow: "hidden", borderRadius: Radius.xl, backgroundColor: Colors.background },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetEyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  sheetTitle: { marginTop: 3, color: Colors.text, fontSize: Typography.section, fontWeight: "900" },
  close: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.surface },
  list: { padding: Spacing.md, gap: Spacing.sm },
  option: { minHeight: 68, flexDirection: "row", alignItems: "center", padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: "#F3F4F6" },
  optionIconSelected: { backgroundColor: Colors.surface },
  optionCopy: { flex: 1, minWidth: 0, marginHorizontal: Spacing.sm },
  optionName: { color: Colors.text, fontSize: Typography.caption, fontWeight: "800" },
  optionDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 17 },
  empty: { padding: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small, textAlign: "center" },
});
