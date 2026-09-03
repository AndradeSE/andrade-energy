import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { IS_GERADOR_APP } from "../config/appVariant";
import { Screen, ElasticScrollView as ScrollView } from "../components/ui";
import AppHeader from "../components/ui/AppHeader";
import { Colors, Radius, Spacing } from "../theme";

type Tutorial = { id: string; titulo: string; descricao: string; duracao: string; video: number };
const tutoriaisGerador: Tutorial[] = [
  { id: "buscar-usina", titulo: "Buscar uma usina", descricao: "Pesquise pelo nome, confira os resultados e limpe a busca.", duracao: "28 s", video: require("../assets/tutorials/gerador-buscar-usina-francisca10.mp4") },
  { id: "usina", titulo: "Selecionar uma usina", descricao: "Escolha a usina e confira o contexto da operação.", duracao: "17 s", video: require("../assets/tutorials/gerador-selecionar-usina-francisca10.mp4") },
  { id: "geracao", titulo: "Geração e carteira", descricao: "Consulte a produção, a energia disponível e o saldo da Home.", duracao: "17 s", video: require("../assets/tutorials/gerador-geracao-carteira-francisca10.mp4") },
  { id: "clientes", titulo: "Clientes e unidades", descricao: "Encontre o cliente e consulte suas unidades e economia total.", duracao: "18 s", video: require("../assets/tutorials/gerador-clientes-unidades-francisca10.mp4") },
  { id: "faturas-uc", titulo: "Faturas da unidade e PDF", descricao: "Consulte as contas da unidade e abra a fatura no leitor do celular.", duracao: "24 s", video: require("../assets/tutorials/gerador-uc-faturas-francisca10.mp4") },
  { id: "filtros", titulo: "Filtrar faturas", descricao: "Consulte todas as cobranças, as vencidas e as pagas.", duracao: "16 s", video: require("../assets/tutorials/gerador-filtrar-faturas-francisca10.mp4") },
  { id: "email", titulo: "Copiar endereço de recebimento", descricao: "Consulte e copie o endereço já ativo. A conexão do e-mail deve ser concluída no provedor.", duracao: "23 s", video: require("../assets/tutorials/gerador-endereco-email-francisca10.mp4") },
  { id: "carteira", titulo: "Consultar carteira", descricao: "Veja saldo e opções financeiras sem realizar uma transferência.", duracao: "23 s", video: require("../assets/tutorials/lote-gerador-financeiro.mp4") },
  { id: "operacao", titulo: "Consultar competências", descricao: "Acompanhe a lista de competências processadas.", duracao: "23 s", video: require("../assets/tutorials/lote-gerador-operacao.mp4") },
  { id: "lista-usinas", titulo: "Consultar usinas", descricao: "Conheça os cards e as opções da área de usinas.", duracao: "23 s", video: require("../assets/tutorials/lote-gerador-usinas.mp4") },
  { id: "detalhe-usina", titulo: "Detalhes da usina", descricao: "Consulte energia, disponibilidade e informações da usina.", duracao: "32 s", video: require("../assets/tutorials/lote-gerador-detalhe-usina.mp4") },
  { id: "detalhe-competencia", titulo: "Detalhes da competência", descricao: "Abra um período processado e confira seus indicadores.", duracao: "32 s", video: require("../assets/tutorials/lote-gerador-detalhe-competencia.mp4") },
  { id: "cadastro-usina", titulo: "Cadastro manual de usina", descricao: "Conheça os campos do cadastro sem criar um registro real.", duracao: "27 s", video: require("../assets/tutorials/lote-gerador-formulario-usina.mp4") },
  { id: "cadastro-cliente", titulo: "Cadastro manual de cliente", descricao: "Conheça o formulário do consumidor sem salvar dados.", duracao: "27 s", video: require("../assets/tutorials/lote-gerador-formulario-cliente.mp4") },
  { id: "fechamento", titulo: "Novo fechamento", descricao: "Veja o formulário e os dados necessários para um fechamento.", duracao: "27 s", video: require("../assets/tutorials/lote-gerador-fechamento.mp4") },
  { id: "faturamento", titulo: "Faturar via conta de energia", descricao: "Encontre o acesso para iniciar o faturamento por documento.", duracao: "32 s", video: require("../assets/tutorials/lote-gerador-faturamento.mp4") },
  { id: "configurar-uc", titulo: "Configurar unidade consumidora", descricao: "Consulte modalidades e parâmetros da unidade.", duracao: "28 s", video: require("../assets/tutorials/lote-gerador-uc-configuracao.mp4") },
  { id: "contrato-uc", titulo: "Contrato da unidade", descricao: "Conheça o formulário de contrato vinculado à UC.", duracao: "28 s", video: require("../assets/tutorials/lote-gerador-uc-contrato.mp4") },
  { id: "assinatura", titulo: "Consultar assinatura", descricao: "Veja o estado e as opções apresentadas para o plano.", duracao: "23 s", video: require("../assets/tutorials/lote-gerador-assinatura.mp4") },
  { id: "perfil", titulo: "Dados e segurança", descricao: "Consulte o perfil e as opções permitidas ao seu acesso.", duracao: "24 s", video: require("../assets/tutorials/lote-gerador-perfil.mp4") },
  { id: "multiempresas", titulo: "Empresas parceiras", descricao: "Acesse o ecossistema multiempresa pela administração.", duracao: "22 s", video: require("../assets/tutorials/lote-gerador-multiempresas.mp4") },
  { id: "personalizacao", titulo: "Logo e cores da empresa", descricao: "Conheça a identidade própria disponível na administração.", duracao: "33 s", video: require("../assets/tutorials/lote-gerador-personalizacao.mp4") },
];
const tutoriaisConsumidor: Tutorial[] = [
  { id: "pdf", titulo: "Abrir a fatura em PDF", descricao: "Encontre a fatura e abra o documento no celular.", duracao: "26 s", video: require("../assets/tutorials/consumidor-pdf-francisca10.mp4") },
  { id: "total", titulo: "Entender o total da fatura", descricao: "Confira o valor a pagar, a economia e os descontos apresentados.", duracao: "17 s", video: require("../assets/tutorials/consumidor-total-francisca10.mp4") },
  { id: "home", titulo: "Visão geral da unidade", descricao: "Conheça os atalhos, indicadores e faturas pendentes.", duracao: "25 s", video: require("../assets/tutorials/lote-consumidor-home.mp4") },
  { id: "economia", titulo: "Consultar economia", descricao: "Acompanhe os indicadores econômicos da unidade.", duracao: "23 s", video: require("../assets/tutorials/lote-consumidor-economia.mp4") },
  { id: "conta-luz", titulo: "Contas da concessionária", descricao: "Consulte os documentos separados das faturas Andrade Energy.", duracao: "27 s", video: require("../assets/tutorials/lote-consumidor-conta-luz.mp4") },
  { id: "contrato", titulo: "Consultar contrato", descricao: "Veja as informações contratuais disponíveis para a UC.", duracao: "23 s", video: require("../assets/tutorials/lote-consumidor-contrato.mp4") },
  { id: "trocar-uc", titulo: "Escolher outra unidade", descricao: "Volte à seleção e alterne entre suas unidades consumidoras.", duracao: "17 s", video: require("../assets/tutorials/lote-consumidor-trocar-uc.mp4") },
  { id: "notificacoes", titulo: "Consultar notificações", descricao: "Abra os avisos importantes da sua conta.", duracao: "12 s", video: require("../assets/tutorials/lote-consumidor-notificacoes.mp4") },
  { id: "perfil", titulo: "Consultar perfil", descricao: "Veja dados pessoais e opções de segurança.", duracao: "28 s", video: require("../assets/tutorials/lote-consumidor-perfil.mp4") },
];

export default function Tutoriais() {
  const { usuario } = useAuth();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const aberturaEmAndamento = useRef(false);
  if (!usuario) return <Redirect href="/login" />;
  const perfil = IS_GERADOR_APP ? "Gerador" : "Consumidor";
  const tutoriais = IS_GERADOR_APP ? tutoriaisGerador : tutoriaisConsumidor;
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
        if (!asset.localUri) throw new Error("Vídeo indisponível. Tente novamente com internet.");
        if (Platform.OS === "android") {
          const uri = await FileSystem.getContentUriAsync(asset.localUri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: uri, type: "video/mp4", flags: 1 });
        } else {
          await Linking.openURL(asset.localUri);
        }
      }
    } catch {
      Alert.alert("Não foi possível abrir o tutorial", "Verifique sua conexão e se há um reprodutor de vídeos instalado. Depois, tente abrir o vídeo novamente.");
    } finally { aberturaEmAndamento.current = false; setAbrindo(null); }
  }
  return <Screen>
    <AppHeader variant="subpage" title="Tutoriais" subtitle={`App ${perfil}`} contextTitle="" contextSubtitle="" icon="play-circle-outline" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.title}>Como usar o app {perfil}</Text>
        <Text style={styles.copy}>Vídeos curtos, narrados e separados por função.</Text>
      </View>
      <View style={styles.list}>
        {tutoriais.map((tutorial, index) => <Pressable key={tutorial.id}
          accessibilityRole="button" accessibilityLabel={`Assistir: ${tutorial.titulo}, ${tutorial.duracao}`}
          accessibilityHint={tutorial.descricao} accessibilityState={{ disabled: abrindo !== null, busy: abrindo === tutorial.id }}
          disabled={abrindo !== null} onPress={() => assistir(tutorial)}
          style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}>
          <View style={styles.play}>{abrindo === tutorial.id
            ? <ActivityIndicator color={Colors.primary} size="small" />
            : <Ionicons name="play-outline" size={21} color={Colors.primary} />}</View>
          <View style={styles.details}>
            <Text style={styles.rowTitle}>{tutorial.titulo}</Text>
            <Text style={styles.metadata}>{abrindo === tutorial.id ? "Abrindo vídeo…" : `${tutorial.duracao} · Narrado`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={Colors.subtitle} />
        </Pressable>)}
      </View>
      <Text style={styles.note}>Os vídeos abrem no reprodutor do celular. Dados pessoais ocultos; valores ilustram a gravação.</Text>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { gap: Spacing.sm },
  list: { borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, minHeight: 72 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  pressed: { opacity: 0.65 },
  play: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  details: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600", color: Colors.text },
  metadata: { fontSize: 12, color: Colors.subtitle },
  note: { fontSize: 12, lineHeight: 18, color: Colors.subtitle },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  copy: { fontSize: 15, lineHeight: 23, color: Colors.subtitle },
});
