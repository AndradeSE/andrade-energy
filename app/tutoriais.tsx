import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Redirect, useLocalSearchParams } from "expo-router";

import { useAuth } from "../contexts/AuthContext";
import { IS_GERADOR_APP } from "../config/appVariant";
import { Screen, ElasticScrollView as ScrollView } from "../components/ui";
import AppHeader from "../components/ui/AppHeader";
import { Colors, Radius, Spacing } from "../theme";

type Tutorial = { id: string; titulo: string; descricao: string; duracao: string; video: number };

const tutoriaisGerador: Tutorial[] = [
  { id: "faturamento-pdf", titulo: "Faturar por PDF", descricao: "Importe a fatura, revise os valores e confira o resultado real do faturamento no Preview.", duracao: "1 min 24 s", video: require("../assets/tutorials/tutorial-faturamento-comercial-real.mp4") },
  { id: "analise-cancelamento", titulo: "Analisar solicitação de cancelamento", descricao: "Localize o pedido, registre a análise e confira uma recusa no ambiente de teste.", duracao: "1 min 46 s", video: require("../assets/tutorials/tutorial-analise-cancelamento-comercial-real.mp4") },
  { id: "renovacao", titulo: "Preparar proposta de renovação", descricao: "Revise as condições, abra a minuta e confira o encaminhamento para aceite do cliente.", duracao: "2 min 20 s", video: require("../assets/tutorials/tutorial-renovacao-gerador-real.mp4") },
  { id: "chave-pix", titulo: "Cadastrar chave Pix com segurança", descricao: "Da Home ao Financeiro: confirme a proteção, confira o titular e veja a chave salva. Nenhuma transferência é feita no vídeo.", duracao: "58 s", video: require("../assets/tutorials/tutorial-chave-pix-salva-real.mp4") },
];

const tutoriaisComercial: Tutorial[] = [
  { id: "plano", titulo: "Cadastrar plano comercial", descricao: "Confira preços, recursos e disponibilidade antes de salvar um plano de teste.", duracao: "1 min 17 s", video: require("../assets/tutorials/tutorial-plano-comercial-real.mp4") },
  { id: "multiempresas", titulo: "Criar e operar outra empresa", descricao: "Cadastre uma empresa de teste e acompanhe a troca para o ambiente separado.", duracao: "1 min 56 s", video: require("../assets/tutorials/tutorial-multiempresas-comercial-real.mp4") },
];

const tutoriaisConsumidor: Tutorial[] = [
  { id: "cancelamento", titulo: "Solicitar cancelamento", descricao: "Comece na Home, revise o aviso, envie o pedido e confira o status aguardando resposta.", duracao: "42 s", video: require("../assets/tutorials/tutorial-cancelamento-completo-real.mp4") },
  { id: "revisao-contrato", titulo: "Conferir revisão do contrato", descricao: "Abra a minuta real e confira as condições antes de aceitar. Nenhum aceite é enviado no vídeo.", duracao: "32 s", video: require("../assets/tutorials/tutorial-revisao-real-consumidor.mp4") },
];

export default function Tutoriais() {
  const { usuario } = useAuth();
  const { ambiente } = useLocalSearchParams<{ ambiente?: string }>();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const aberturaEmAndamento = useRef(false);
  if (!usuario) return <Redirect href="/login" />;

  const comercial = IS_GERADOR_APP && ambiente === "comercial" && usuario.perfil === "ADMIN";
  const grupos = IS_GERADOR_APP
    ? comercial ? [{ titulo: "Comercial e multiempresas", videos: tutoriaisComercial }] : [{ titulo: "Gerador", videos: tutoriaisGerador }]
    : [{ titulo: "Consumidor", videos: tutoriaisConsumidor }];

  async function assistir(tutorial: Tutorial) {
    if (aberturaEmAndamento.current) return;
    aberturaEmAndamento.current = true;
    setAbrindo(tutorial.id);
    try {
      const asset = Asset.fromModule(tutorial.video);
      if (Platform.OS === "web") {
        await Linking.openURL(asset.uri);
      } else {
        await asset.downloadAsync();
        if (!asset.localUri) throw new Error("Vídeo indisponível.");
        if (Platform.OS === "android") {
          const uri = await FileSystem.getContentUriAsync(asset.localUri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: uri, type: "video/mp4", flags: 1 });
        } else {
          await Linking.openURL(asset.localUri);
        }
      }
    } catch {
      Alert.alert("Não foi possível abrir o vídeo", "Verifique a conexão e se há um reprodutor de vídeos instalado. Depois, tente novamente.");
    } finally {
      aberturaEmAndamento.current = false;
      setAbrindo(null);
    }
  }

  return <Screen>
    <AppHeader variant="subpage" title="Tutoriais" subtitle="Andrade Energy" contextTitle="" contextSubtitle="" icon="play-circle-outline" environmentName={comercial ? "Gestão comercial" : "Gestão de usinas"} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.title}>Vídeos por processo</Text>
        <Text style={styles.copy}>Gravações reais do aplicativo, com dados pessoais ocultados. Nenhuma operação é executada ao assistir.</Text>
      </View>
      {grupos.map((grupo) => <View key={grupo.titulo}>
        <Text style={styles.groupTitle}>{grupo.titulo}</Text>
        {grupo.videos.length === 0 && <Text style={styles.copy}>Os tutoriais deste ambiente estão sendo gravados.</Text>}
        <View style={styles.list}>
          {grupo.videos.map((tutorial, index) => <Pressable
            key={tutorial.id}
            accessibilityRole="button"
            accessibilityLabel={`Assistir ${tutorial.titulo}, ${tutorial.duracao}`}
            accessibilityHint={tutorial.descricao}
            accessibilityState={{ disabled: abrindo !== null, busy: abrindo === tutorial.id }}
            disabled={abrindo !== null}
            onPress={() => void assistir(tutorial)}
            style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}
          >
            <View style={styles.play}>{abrindo === tutorial.id ? <ActivityIndicator color={Colors.primary} size="small" /> : <Ionicons name="play-outline" size={22} color={Colors.primary} />}</View>
            <View style={styles.details}>
              <Text style={styles.rowTitle}>{tutorial.titulo}</Text>
              <Text style={styles.description}>{tutorial.descricao}</Text>
              <Text style={styles.metadata}>{abrindo === tutorial.id ? "Abrindo vídeo…" : `${tutorial.duracao} · Narrado`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
          </Pressable>)}
        </View>
      </View>)}
      <Text style={styles.note}>Os vídeos abrem no reprodutor do celular. Nenhum cadastro, convite, contrato ou transferência é realizado ao assistir.</Text>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  intro: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  copy: { fontSize: 15, lineHeight: 22, color: Colors.subtitle },
  groupTitle: { marginBottom: Spacing.sm, fontSize: 17, fontWeight: "800", color: Colors.text },
  list: { borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, minHeight: 84 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  pressed: { opacity: 0.65 },
  play: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  details: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: Colors.text },
  description: { fontSize: 13, lineHeight: 18, color: Colors.subtitle },
  metadata: { fontSize: 12, color: Colors.primary },
  note: { fontSize: 12, lineHeight: 18, color: Colors.subtitle },
});
