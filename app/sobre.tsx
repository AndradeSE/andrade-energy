import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, ElasticScrollView, Screen } from "../components/ui";
import { APP_DISPLAY_NAME } from "../config/appVariant";
import { Colors, Spacing } from "../theme";
const historico = [
  { data: "03/10/2026", melhorias: [
    "Importação da produção da usina por PDF, identificando a UC na carteira ativa.",
    "Cadastro com endereço completo e busca por CEP para cliente, gerador e usina.",
    "Faturamento automático com códigos de pagamento e progresso da emissão.",
  ] },
  { data: "02/10/2026", melhorias: [
    "Desconto da UC visível na lista de unidades consumidoras.",
  ] },
  { data: "01/10/2026", melhorias: [
    "Ícones e identificação separados para os aplicativos Preview e produção.",
  ] },
];

export default function SobreApp() {
  const version = Constants.expoConfig?.version ?? "Não informada";
  const revision = Updates.updateId?.slice(-8) ?? "Versão incluída no instalador";
  const ambiente = Constants.expoConfig?.extra?.appEnv === "preview" || Updates.channel?.startsWith("preview") ? "Preview / homologação" : "Produção";
  return <Screen>
    <AppHeader variant="subpage" title="Sobre o app" subtitle="Andrade Energy" contextTitle="" contextSubtitle="" icon="information-circle-outline" />
    <ElasticScrollView contentContainerStyle={styles.content}>
      <Card><Text style={styles.title}>{APP_DISPLAY_NAME}</Text><Text style={styles.text}>Versão {version}</Text><Text style={styles.text}>Revisão: {revision}</Text><Text style={styles.text}>{ambiente}</Text></Card>
      <Card><Text style={styles.title}>Histórico de atualizações</Text>{historico.map(versao => <View key={versao.data}><Text style={styles.date}>{versao.data}</Text>{versao.melhorias.map(texto => <View key={texto} style={styles.item}><Text style={styles.dot}>•</Text><Text style={[styles.text, { flex: 1 }]}>{texto}</Text></View>)}</View>)}</Card>
    </ElasticScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: 19, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  text: { fontSize: 14, lineHeight: 22, color: Colors.subtitle },
  date: { fontSize: 12, color: Colors.subtitle, marginBottom: 12 },
  item: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dot: { color: Colors.primary, fontSize: 18 },
});
