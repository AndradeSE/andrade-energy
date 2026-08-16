import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Badge, Card, EmptyState, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { excluirUsina, importarFaturaGeradora, listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Usinas() {
  const { usuario, usinaSelecionada, selecionarUsina, atualizarUsuario } = useAuth();
  const [usinas, setUsinas] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [importandoId, setImportandoId] = useState<string | null>(null);
  const carregar = useCallback(async () => { try { setUsinas((await listarUsinas()) ?? []); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function confirmarExclusao(item: any) {
    Alert.alert("Excluir usina", `Deseja excluir ${item.nome}? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        try {
          await excluirUsina(item.id);
          setUsinas((atuais) => atuais.filter((usina) => usina.id !== item.id));
          if (usuario?.usina_id === item.id) await atualizarUsuario({ usina_id: null });
          if (usinaSelecionada?.id === item.id) selecionarUsina(null);
        } catch (erro: any) {
          Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? erro?.message);
        }
      } },
    ]);
  }

  async function importarProducao(item: any) {
    const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
    if (arquivo.canceled) return;
    try {
      setImportandoId(item.id);
      const pdf = arquivo.assets[0];
      const resultado = await importarFaturaGeradora(item.id, pdf.uri, pdf.name);
      const dados = resultado.dados;
      await carregar();
      Alert.alert(
        "Produção importada",
        `${Number(dados.energiaGerada).toLocaleString("pt-BR")} kWh calculados\n\nLeitura anterior: ${Number(dados.leituraAnterior).toLocaleString("pt-BR")}\nLeitura atual: ${Number(dados.leituraAtual).toLocaleString("pt-BR")}\nFator: ${Number(dados.fatorMultiplicacao).toLocaleString("pt-BR")}`
      );
    } catch (erro: any) {
      Alert.alert("Não foi possível importar", erro?.response?.data?.message ?? erro?.message ?? "Confira a conta de energia da usina.");
    } finally {
      setImportandoId(null);
    }
  }

  return <Screen><AppHeader title="Usinas" subtitle="Ativos de geração" contextTitle={`${usinas.length} usinas cadastradas`} contextSubtitle="Produção, unidades e operação" icon="business-outline" />
    {loading ? <Loading /> : <FlatList contentContainerStyle={styles.content} data={usinas} keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><Text style={styles.title}>Parque gerador</Text><Text style={styles.subtitle}>Acompanhe e mantenha os dados de cada usina.</Text><CadastroActions tipo="USINA" /></View>}
      renderItem={({ item }) => { const ativa = usinaSelecionada?.id === item.id; return <Pressable onPress={() => { selecionarUsina(item); router.push(`/usinas/${item.id}`); }}><Card style={ativa ? styles.activeCard : undefined}><View style={styles.row}><View style={[styles.icon, ativa && styles.activeIcon]}><Ionicons name="sunny-outline" size={25} color={Colors.primary} /></View><View style={styles.info}><View style={styles.nameRow}><Text style={styles.name}>{item.nome}</Text>{ativa ? <Badge label="EM USO" variant="info" /> : null}</View><Text style={styles.detail}>{item.numero_instalacao ? `Instalação ${item.numero_instalacao}` : item.distribuidora ?? "CEMIG"}</Text></View><Badge label={item.status ?? "ATIVA"} variant={item.status === "INATIVA" ? "danger" : "success"} /><TouchableOpacity accessibilityLabel={`Excluir usina ${item.nome}`} onPress={(event) => { event.stopPropagation(); confirmarExclusao(item); }} style={styles.delete}><Ionicons name="trash-outline" size={20} color={Colors.danger} /></TouchableOpacity></View><View style={styles.metrics}><View><Text style={styles.metricLabel}>ALOCADO</Text><Text style={styles.metricValue}>{Number(item.fechamento_atual?.energia_alocada ?? 0).toLocaleString("pt-BR")} kWh</Text></View><View><Text style={styles.metricLabel}>RESTANTE</Text><Text style={styles.metricValue}>{Number(item.fechamento_atual?.energia_disponivel ?? 0).toLocaleString("pt-BR")} kWh</Text></View><View><Text style={styles.metricLabel}>MÉDIA 12 MESES</Text><Text style={styles.metricValue}>{Number(item.producao_media_12_meses ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh</Text></View></View><View style={styles.detailsLink}><Text style={styles.openText}>{ativa ? "Usina selecionada" : "Selecionar e ver detalhes"}</Text><Ionicons name="arrow-forward" size={17} color={Colors.primary} /></View><TouchableOpacity disabled={importandoId === item.id} onPress={(event) => { event.stopPropagation(); importarProducao(item); }} style={styles.importButton}><Ionicons name="document-attach-outline" size={18} color={Colors.primary} /><Text style={styles.importText}>{importandoId === item.id ? "Lendo conta..." : "Importar dados de produção"}</Text></TouchableOpacity></Card></Pressable>; }}
      ListEmptyComponent={<EmptyState icon="sunny-outline" title="Nenhuma usina cadastrada" subtitle="Cadastre manualmente ou importe a fatura da unidade geradora." />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center" }, activeCard: { borderWidth: 2, borderColor: Colors.primary }, activeIcon: { borderWidth: 1, borderColor: Colors.primary }, icon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, info: { flex: 1, marginHorizontal: Spacing.sm }, nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs }, name: { flexShrink: 1, color: Colors.text, fontSize: Typography.body, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  metrics: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, metricLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "700" }, metricValue: { marginTop: 3, color: Colors.text, fontWeight: "700" }, detailsLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: Spacing.sm }, openText: { marginRight: 5, color: Colors.primary, fontSize: Typography.small, fontWeight: "700" }, delete: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: Spacing.xs, borderRadius: Radius.round, backgroundColor: "#FEE2E2" },
  importButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md }, importText: { color: Colors.primary, fontWeight: "800" },
});
