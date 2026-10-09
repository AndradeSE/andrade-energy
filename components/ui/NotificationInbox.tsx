import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "../../theme";

type Notification = { id: string; titulo: string; detalhe?: string; rota?: string; criado_em?: string };
type Props = {
  items: Notification[];
  readIds: string[];
  ready: boolean;
  onMark: (ids: string[]) => Promise<void>;
  onOpen: (item: Notification) => void;
  onClose: () => void;
  onClear: () => void;
};

export default function NotificationInbox({ items, readIds, ready, onMark, onOpen, onClose, onClear }: Props) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const read = new Set(readIds);
  const unread = items.filter((item) => !read.has(String(item.id)));
  async function mark(ids: string[]) {
    if (!ready || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await onMark(ids); }
    catch { Alert.alert("Leitura não salva", "Não foi possível salvar a leitura. Tente novamente."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <View style={styles.panel}>
    <View style={styles.header}>
      <View style={styles.heading}><Text style={styles.title}>Notificações</Text><Text style={styles.summary}>{!ready ? "Carregando…" : unread.length ? `${unread.length} nova${unread.length === 1 ? "" : "s"}` : "Tudo em dia"}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar notificações" onPress={onClose} hitSlop={12} style={styles.close}><Ionicons name="close" size={26} color={Colors.text} /></Pressable>
    </View>
    {ready && items.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar lista de notificações" disabled={saving} onPress={onClear} style={[styles.clear, saving && styles.disabled]}><Text style={styles.clearText}>Limpar lista</Text></Pressable> : null}
    {ready && unread.length > 0 ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={() => void mark(unread.map((item) => String(item.id)))} style={[styles.markAll, saving && styles.disabled]}><Text style={styles.buttonText}>{saving ? "Salvando…" : "Marcar todas como lidas"}</Text></Pressable> : null}
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {items.map((item) => {
        const isRead = ready && read.has(String(item.id));
        const date = item.criado_em ? new Date(item.criado_em) : null;
        return <View key={String(item.id)} style={[styles.item, isRead && styles.itemRead]}>
          <View style={[styles.indicator, isRead && styles.indicatorRead]}><Ionicons name={isRead ? "checkmark" : "alert"} size={17} color={isRead ? Colors.subtitle : Colors.primary} /></View>
          <View style={styles.copy}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.titulo}`} disabled={saving} onPress={() => onOpen(item)}><Text style={styles.itemTitle}>{item.titulo}</Text>{item.detalhe ? <Text style={styles.detail}>{item.detalhe}</Text> : null}{date && !Number.isNaN(date.getTime()) ? <Text style={styles.date}>{date.toLocaleString("pt-BR")}</Text> : null}</Pressable>
            {ready && !isRead ? <Pressable accessibilityRole="button" accessibilityLabel={`Marcar como lida: ${item.titulo}`} accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={() => void mark([String(item.id)])} style={[styles.markOne, saving && styles.disabled]}><Text style={styles.buttonText}>Marcar como lida</Text></Pressable> : null}
          </View>
        </View>;
      })}
      {!items.length ? <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  panel: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  heading: { flex: 1, gap: 4 },
  title: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  summary: { color: Colors.subtitle, fontSize: 14 },
  close: { padding: 9 },
  clear: { alignSelf: "flex-end", paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8 },
  clearText: { color: Colors.subtitle, fontSize: 12, textDecorationLine: "underline" },
  markAll: { alignSelf: "flex-start", borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  buttonText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  list: { paddingBottom: Spacing.xxl, gap: 12 },
  item: { flexDirection: "row", gap: 12, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: "#F0FAF5" },
  itemRead: { backgroundColor: Colors.surface },
  indicator: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#DDF1E7" },
  indicatorRead: { backgroundColor: "#EDF1EE" },
  copy: { flex: 1, gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, lineHeight: 21 },
  detail: { fontSize: 14, color: Colors.subtitle, lineHeight: 20, marginTop: 4 },
  date: { fontSize: 12, color: Colors.subtitle, marginTop: 6 },
  markOne: { alignSelf: "flex-start", paddingVertical: 12, paddingHorizontal: 4 },
  disabled: { opacity: 0.5 },
  empty: { paddingVertical: 24, textAlign: "center", color: Colors.subtitle, fontSize: 15 },
});
