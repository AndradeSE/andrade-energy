import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import PortalBrandLogo from "../components/brand/PortalBrandLogo";
import { ElasticScrollView as ScrollView } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";
import { listarMinhasEmpresas } from "../services/empresas.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../theme";

type AcessoGerador = {
  id: string;
  nome: string;
  papel: string;
  cor_primaria?: string | null;
};

export default function SelecionarGerador() {
  const insets = useSafeAreaInsets();
  const { selecionarUnidade, logout } = useAuth();
  const { empresa, trocarEmpresa } = useEmpresa();
  const [acessos, setAcessos] = useState<AcessoGerador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [selecionando, setSelecionando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const itens = await listarMinhasEmpresas();
      setAcessos(itens.filter((item) => item.papel === "LEITURA"));
    } catch (error: any) {
      Alert.alert("Não foi possível carregar", error?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const unico = useMemo(() => acessos.length === 1 ? acessos[0] : null, [acessos]);

  const escolher = useCallback(async (item: AcessoGerador) => {
    if (selecionando) return;
    setSelecionando(item.id);
    try {
      await selecionarUnidade(null);
      if (item.id !== empresa.id) await trocarEmpresa(item.id);
      router.replace("/selecionar-unidade");
    } catch (error: any) {
      Alert.alert("Não foi possível acessar", error?.response?.data?.message ?? "Tente novamente.");
      setSelecionando(null);
    }
  }, [empresa.id, selecionarUnidade, selecionando, trocarEmpresa]);

  useEffect(() => {
    if (!carregando && unico && !selecionando) void escolher(unico);
  }, [carregando, escolher, selecionando, unico]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <LinearGradient colors={[empresa.cor_primaria || "#087A46", "#082F26"]} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <PortalBrandLogo height={44} width={158} />
        <Text style={styles.headerTitle}>Escolha seu gerador</Text>
        <Text style={styles.headerText}>Cada gerador mantém suas unidades, contratos e faturas separados.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => { setAtualizando(true); void carregar(); }} colors={[Colors.primary]} />}>
        {carregando || unico ? (
          <View style={styles.loading}><ActivityIndicator color={Colors.primary} size="large" /><Text style={styles.loadingText}>{unico ? "Abrindo seu gerador..." : "Carregando geradores..."}</Text></View>
        ) : acessos.length ? (
          <>
            <Text style={styles.title}>Com qual gerador deseja entrar?</Text>
            <Text style={styles.subtitle}>Depois você escolherá uma unidade consumidora vinculada a ele.</Text>
            {acessos.map((item) => {
              const ativo = item.id === empresa.id;
              const processando = selecionando === item.id;
              return (
                <TouchableOpacity activeOpacity={0.84} disabled={Boolean(selecionando)} key={item.id} onPress={() => void escolher(item)} style={[styles.card, ativo && styles.cardActive]}>
                  <View style={[styles.icon, { backgroundColor: item.cor_primaria || Colors.primary }]}><Ionicons name="business-outline" size={25} color="#FFFFFF" /></View>
                  <View style={styles.copy}><Text numberOfLines={2} style={styles.name}>{item.nome}</Text><Text style={styles.hint}>{ativo ? "Gerador atual" : "Acessar este gerador"}</Text></View>
                  {processando ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="chevron-forward" size={22} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View style={styles.empty}><Ionicons name="alert-circle-outline" size={34} color={Colors.subtitle} /><Text style={styles.title}>Nenhum gerador disponível</Text><Text style={styles.subtitle}>Peça ao seu gerador para enviar um novo convite para este e-mail.</Text></View>
        )}
        <TouchableOpacity onPress={logout} style={styles.logout}><Ionicons name="log-out-outline" size={19} color={Colors.subtitle} /><Text style={styles.logoutText}>Sair da conta</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: "center", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  headerTitle: { marginTop: Spacing.md, color: "#FFFFFF", fontSize: Typography.title, fontWeight: "900", textAlign: "center" },
  headerText: { maxWidth: 350, marginTop: Spacing.xs, color: "rgba(255,255,255,.82)", fontSize: Typography.small, lineHeight: 19, textAlign: "center" },
  content: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { color: Colors.text, fontSize: Typography.section, fontWeight: "900", textAlign: "center" },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19, textAlign: "center" },
  card: { minHeight: 86, flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: "#C9DED1", borderRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadows.card },
  cardActive: { borderColor: Colors.primary },
  icon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: Radius.lg },
  copy: { flex: 1, minWidth: 0 },
  name: { color: Colors.text, fontSize: Typography.card, fontWeight: "900" },
  hint: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  loading: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: Typography.small },
  empty: { minHeight: 260, alignItems: "center", justifyContent: "center" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: "auto", paddingTop: Spacing.xl },
  logoutText: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" },
});
