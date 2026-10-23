import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Button from "./ui/Button";
import { registerQuotaReading, type QuotaService, type ServiceQuotas } from "../services/cotas-servicos.service";
import { quotaNumber, quotaValidity } from "../utils/quota-form";
import { Colors } from "../theme";

export function QuotaManualForm({ item, onSaved }: { item: QuotaService; onSaved: (data: ServiceQuotas) => void }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState("");
  const [limit, setLimit] = useState("");
  const [validity, setValidity] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (item.automatico) return null;
  async function save() {
    if (busy) return;
    const usado = quotaNumber(used), limite = quotaNumber(limit), validaAte = quotaValidity(validity);
    if (!confirmed || !Number.isFinite(usado) || usado < 0 || !Number.isFinite(limite) || limite <= 0 || !validaAte || Date.parse(validaAte) <= Date.now()) {
      setError("Confira os valores, informe uma data futura e confirme a conferência no painel."); return;
    }
    setBusy(true); setError("");
    try { onSaved(await registerQuotaReading({ servico: item.servico, metrica: item.metrica, usado, limite, validaAte, confirmado: true })); setOpen(false); setConfirmed(false); }
    catch { setError("Não foi possível salvar. Confira os dados e tente novamente."); }
    finally { setBusy(false); }
  }
  return <View style={styles.form}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} disabled={busy} onPress={() => setOpen(!open)} style={styles.toggle}>
      <Text style={styles.link}>{open ? "Fechar conferência" : "Informar leitura do painel"}</Text>
    </Pressable>
    {open ? <>
      <Text style={styles.text}>Confira o painel do provedor e registre os valores. Esta leitura é manual; os alertas usam os valores informados.</Text>
      <Text style={styles.label}>Utilizado ({item.unidade})</Text><TextInput accessibilityLabel={`Utilizado em ${item.rotulo}`} style={styles.input} value={used} onChangeText={setUsed} keyboardType="decimal-pad" editable={!busy} maxLength={18}/>
      <Text style={styles.label}>Limite ({item.unidade})</Text><TextInput accessibilityLabel={`Limite de ${item.rotulo}`} style={styles.input} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" editable={!busy} maxLength={18}/>
      <Text style={styles.label}>Leitura válida até (DD/MM/AAAA)</Text><TextInput accessibilityLabel="Leitura válida até" placeholder="DD/MM/AAAA" style={styles.input} value={validity} onChangeText={setValidity} keyboardType="numbers-and-punctuation" editable={!busy} maxLength={10}/>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(!confirmed)} disabled={busy} style={styles.check}>
        <Text style={styles.link}>{confirmed ? "☑" : "☐"}</Text><Text style={[styles.text, { flex: 1 }]}>Conferi estes valores no painel do provedor.</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button title={busy ? "Salvando…" : "Salvar leitura confirmada"} disabled={busy || !confirmed} onPress={() => void save()}/>
    </> : null}
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 8 }, toggle: { minHeight: 44, justifyContent: "center" }, link: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  text: { color: Colors.text, fontSize: 14, lineHeight: 21 }, label: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#9CAFA4", borderRadius: 10, padding: 12, color: Colors.text, backgroundColor: "#FFFFFF" },
  check: { flexDirection: "row", gap: 10, minHeight: 48, alignItems: "center" }, error: { color: "#A52B21", fontSize: 14 },
});
