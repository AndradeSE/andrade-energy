import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ImageBackground, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Card, ElasticFlatList as FlatList, EmptyState, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { excluirUsina, importarFaturaGeradora, listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Usinas() {
  const { usuario, usinaSelecionada, selecionarUsina, atualizarUsuario, suspenderBloqueioTemporariamente } = useAuth();
  const [usinas, setUsinas] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [atualizando, setAtualizando] = useState(false);
  const [importandoId, setImportandoId] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    try {
      const lista = (await listarUsinas()) ?? [];
      const fotos = await AsyncStorage.multiGet(lista.map((item: any) => `foto-card-usina:${item.id}`));
      const porChave = new Map(fotos);
      setUsinas(lista.map((item: any) => ({ ...item, foto_card_local: porChave.get(`foto-card-usina:${item.id}`) || "" })));
    } catch (erro: any) {
      setUsinas([]);
      Alert.alert("Não foi possível carregar as usinas", erro?.response?.data?.message ?? "Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  async function atualizarPagina() { setAtualizando(true); try { await carregar(); } finally { setAtualizando(false); } }

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
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      if (arquivo.canceled) return;

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
      retomarBloqueio();
    }
  }

  return <Screen><AppHeader title="Usinas" subtitle="Ativos de geração" contextTitle={`${usinas.length} usinas cadastradas`} contextSubtitle="Produção, unidades e operação" icon="business-outline" />
    {loading ? <Loading /> : <FlatList bounces alwaysBounceVertical overScrollMode="always" refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content} data={usinas} keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><Card><Text style={styles.title}>Parque gerador</Text><Text style={styles.subtitle}>Acompanhe e mantenha os dados de cada usina.</Text></Card><CadastroActions tipo="USINA" /></View>}
      renderItem={({ item }) => {
        const ativa = usinaSelecionada?.id === item.id;
        const quantidadeUcs = Number(item.unidades_alocadas ?? 0);
        const energiaAlocada = Math.max(0, Number(item.fechamento_atual?.energia_alocada ?? 0));
        const energiaDisponivel = Math.max(0, Number(item.fechamento_atual?.energia_disponivel ?? 0));
        const energiaTotal = energiaAlocada + energiaDisponivel;
        const autonomia = energiaTotal > 0 ? Math.max(0, Math.min(100, energiaDisponivel / energiaTotal * 100)) : 0;
        const producaoMedia = Math.max(0, Number(item.producao_media_12_meses ?? 0));
        const geracaoCompetencia = Math.max(0, Number(item.fechamento_atual?.energia_gerada ?? 0));
        const geracaoTotal = Math.max(geracaoCompetencia, Number(item.geracao_total ?? 0));
        const status = String(item.status ?? "ATIVA").toUpperCase();
        const estaInativa = status === "INATIVA" || status === "INATIVO";
        const formatarEnergia = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;

        return <Pressable onPress={() => { selecionarUsina(item); router.push(`/usinas/${item.id}`); }}>
          <Card style={[styles.plantCard, ativa && styles.activeCard]}>
            <ImageBackground source={item.foto_card_local ? { uri: item.foto_card_local } : require("../../assets/images/usina-loading.jpeg")} imageStyle={styles.coverImage} style={styles.cover}>
              <LinearGradient colors={["rgba(2,25,18,.12)", "rgba(2,25,18,.86)"]} style={styles.coverShade}>
                <View style={styles.coverTop}><View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{estaInativa ? "INATIVA" : "EM OPERAÇÃO"}</Text></View><Ionicons name="chevron-forward-circle" size={26} color="#FFF" /></View>
                <View style={styles.generationMain}><Text style={styles.generationLabel}>GERAÇÃO NESTA COMPETÊNCIA</Text><Text style={styles.generationValue}>{formatarEnergia(geracaoCompetencia)}</Text></View>
                <View style={styles.coverMetrics}><View style={styles.coverMetric}><Text style={styles.coverMetricLabel}>MÉDIA MENSAL</Text><Text style={styles.coverMetricValue}>{formatarEnergia(producaoMedia)}</Text></View><View style={styles.coverDivider} /><View style={styles.coverMetric}><Text style={styles.coverMetricLabel}>GERAÇÃO ACUMULADA</Text><Text style={styles.coverMetricValue}>{formatarEnergia(geracaoTotal)}</Text></View></View>
              </LinearGradient>
            </ImageBackground>
            <View style={styles.cardHeader}>
              <View style={[styles.plantIcon, ativa && styles.activeIcon]}><Ionicons name="sunny-outline" size={24} color={Colors.primary} /></View>
              <View style={styles.plantIdentity}>
                <Text numberOfLines={2} style={styles.name}>{item.nome}</Text>
                <View style={styles.installationRow}>
                  <Ionicons name="flash-outline" size={14} color={Colors.primary} />
                  <Text numberOfLines={1} style={styles.detail}>{item.numero_instalacao ? `UC ${item.numero_instalacao}` : item.distribuidora ?? "Concessionária não informada"}</Text>
                </View>
              </View>
              <TouchableOpacity accessibilityLabel={`Excluir usina ${item.nome}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); confirmarExclusao(item); }} style={styles.delete}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusDot, estaInativa ? styles.statusDotInactive : styles.statusDotActive]} />
                <Text style={[styles.statusText, estaInativa && styles.statusTextInactive]}>{status}{ativa ? " · selecionada" : ""}</Text>
              </View>
              <View style={styles.allocationSummary}>
                <Ionicons name="people-outline" size={16} color={Colors.primary} />
                <Text style={styles.allocationText}>{quantidadeUcs} {quantidadeUcs === 1 ? "UC alocada" : "UCs alocadas"}</Text>
              </View>
            </View>

            <View style={styles.energyPanel}>
              <View style={styles.energyHeading}>
                <Text style={styles.energyLabel}>Autonomia da usina</Text>
                <Text style={styles.autonomyValue}>{energiaTotal > 0 ? `${autonomia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% livre` : "Sem medição"}</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressAvailable, { width: `${autonomia}%` }]} /></View>
              <View style={styles.energyValues}>
                <View style={styles.energyMetric}>
                  <Text style={styles.metricLabel}>DISPONÍVEL</Text>
                  <Text style={styles.availableValue}>{formatarEnergia(energiaDisponivel)}</Text>
                </View>
                <View style={styles.energyDivider} />
                <View style={styles.energyMetric}>
                  <Text style={styles.metricLabel}>ALOCADA</Text>
                  <Text style={styles.metricValue}>{formatarEnergia(energiaAlocada)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.averageInfo}>
                <Ionicons name="analytics-outline" size={17} color={Colors.secondary} />
                <View>
                  <Text style={styles.averageLabel}>Média de produção · 12 meses</Text>
                  <Text style={styles.averageValue}>{formatarEnergia(producaoMedia)}</Text>
                </View>
              </View>
              <View style={styles.openLink}><Text style={styles.openText}>{ativa ? "Selecionada" : "Ver detalhes"}</Text><Ionicons name="chevron-forward" size={17} color={Colors.primary} /></View>
            </View>

            <TouchableOpacity disabled={importandoId === item.id} onPress={(event) => { event.stopPropagation(); importarProducao(item); }} style={styles.importButton}>
              <Ionicons name="document-attach-outline" size={18} color={Colors.primary} />
              <Text style={styles.importText}>{importandoId === item.id ? "Lendo conta..." : "Importar dados de produção"}</Text>
            </TouchableOpacity>
          </Card>
        </Pressable>;
      }}
      ListEmptyComponent={<EmptyState icon="sunny-outline" title="Nenhuma usina cadastrada" subtitle="Cadastre manualmente ou importe a fatura da unidade geradora." />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 20 },
  plantCard: { marginBottom: Spacing.md, padding: 0, overflow: "hidden", borderWidth: 1, borderColor: "#C9DED1", borderRadius: Radius.xl, backgroundColor: "#F2F8F4" }, activeCard: { borderColor: "#79A98D", backgroundColor: "#EAF4ED" },
  cover: { height: 210, justifyContent: "flex-end" }, coverImage: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl }, coverShade: { flex: 1, justifyContent: "space-between", padding: Spacing.md }, coverTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.round, backgroundColor: "rgba(2,32,23,.62)" }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#38E184" }, liveText: { color: "#FFF", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, generationMain: { alignItems: "center" }, generationLabel: { color: "rgba(255,255,255,.78)", fontSize: 10, fontWeight: "800", letterSpacing: .8 }, generationValue: { marginTop: 4, color: "#FFF", fontSize: 32, fontWeight: "900", textShadowColor: "rgba(0,0,0,.35)", textShadowRadius: 4 }, coverMetrics: { flexDirection: "row", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.28)" }, coverMetric: { flex: 1, alignItems: "center" }, coverMetricLabel: { color: "rgba(255,255,255,.68)", fontSize: 9, fontWeight: "800" }, coverMetricValue: { marginTop: 3, color: "#FFF", fontSize: Typography.small, fontWeight: "900" }, coverDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,.3)" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: Spacing.md, paddingTop: Spacing.md }, plantIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D7DDD9", borderRadius: Radius.sm, backgroundColor: "#F4F6F4" }, activeIcon: { borderColor: "#79A98D" }, plantIdentity: { flex: 1, minWidth: 0, marginHorizontal: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, lineHeight: 20, fontWeight: "800" }, installationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }, detail: { flex: 1, color: Colors.subtitle, fontSize: Typography.small }, delete: { width: 30, height: 30, alignItems: "center", justifyContent: "center", marginTop: -2, borderRadius: Radius.round, backgroundColor: "#F3E6E6" },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm, marginTop: Spacing.sm, paddingHorizontal: Spacing.md }, statusInfo: { flexDirection: "row", alignItems: "center", gap: 5 }, statusDot: { width: 7, height: 7, borderRadius: Radius.round }, statusDotActive: { backgroundColor: Colors.success }, statusDotInactive: { backgroundColor: Colors.danger }, statusText: { color: Colors.success, fontSize: Typography.small, fontWeight: "700" }, statusTextInactive: { color: Colors.danger }, allocationSummary: { flexDirection: "row", alignItems: "center", gap: 5 }, allocationText: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" },
  energyPanel: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: "#D5DAD7" }, energyHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm }, energyLabel: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" }, autonomyValue: { color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, progressTrack: { height: 4, marginTop: 7, overflow: "hidden", borderRadius: Radius.round, backgroundColor: "#CAD2CD" }, progressAvailable: { height: "100%", minWidth: 2, borderRadius: Radius.round, backgroundColor: "#4D8A63" }, energyValues: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm }, energyMetric: { flex: 1 }, energyDivider: { width: 1, height: 25, marginHorizontal: Spacing.sm, backgroundColor: "#D5DAD7" }, metricLabel: { color: Colors.subtitle, fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }, metricValue: { marginTop: 2, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, availableValue: { marginTop: 2, color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm, marginTop: Spacing.sm, paddingHorizontal: Spacing.md }, averageInfo: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 }, averageLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "700" }, averageValue: { marginTop: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, openLink: { flexDirection: "row", alignItems: "center", gap: 2 }, openText: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "800" },
  importButton: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: "#D5DAD7" }, importText: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "800" },
});
