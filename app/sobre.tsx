import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, ElasticScrollView, Screen } from "../components/ui";
import { APP_DISPLAY_NAME } from "../config/appVariant";
import { Colors, Spacing } from "../theme";
import { abrirSiteApp } from "../utils/siteApp";

const melhorias = [
  "Tutoriais revisados com gravações reais, organizados por ambiente.",
  "Cadastro do cliente com nome completo, CPF validado e endereço com busca por CEP.",
  "O contrato aproveita o endereço informado no cadastro do cliente.",
  "Identificação discreta da versão e da revisão na tela de carregamento.",
  "Acesso ao site e às informações do aplicativo pelo menu.",
];

export default function SobreApp() {
  const version = Constants.expoConfig?.version ?? "Não informada";
  const revision = Updates.updateId?.slice(-8) ?? "Versão incluída no instalador";
  const ambiente = Constants.expoConfig?.extra?.appEnv === "preview" || Updates.channel?.startsWith("preview") ? "Preview / homologação" : "Produção";
  return <Screen>
    <AppHeader variant="subpage" title="Sobre o app" subtitle="Andrade Energy" contextTitle="" contextSubtitle="" icon="information-circle-outline" />
    <ElasticScrollView contentContainerStyle={styles.content}>
      <Card><Text style={styles.title}>{APP_DISPLAY_NAME}</Text><Text style={styles.text}>Versão {version}</Text><Text style={styles.text}>Revisão: {revision}</Text><Text style={styles.text}>{ambiente}</Text></Card>
      <Card><Text style={styles.title}>Últimas melhorias</Text><Text style={styles.date}>Revisão de 03/10/2026</Text>{melhorias.map(texto => <View key={texto} style={styles.item}><Text style={styles.dot}>•</Text><Text style={[styles.text, { flex: 1 }]}>{texto}</Text></View>)}</Card>
      <Button title="Acessar o site Andrade Energy" onPress={() => void abrirSiteApp()} />
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
