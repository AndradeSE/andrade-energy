import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, ElasticScrollView, Screen } from "../components/ui";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../config/appVariant";
import { Colors, Spacing } from "../theme";
const atualizacaoAnterior = {
  numero: "1.0.0-r20261004.2", data: "04/10/2026",
  melhorias: IS_GERADOR_APP ? [
    "Logo animada na abertura, com lâmpada e cabo iluminados até o app ficar pronto.",
    "Quantidade de UCs vinculadas exibida no card de cada cliente.",
  ] : [
    "Logo animada na abertura, com lâmpada e cabo iluminados até o app ficar pronto.",
  ],
};
const atualizacaoAtual = {
  numero: "1.0.0-r20261004.3", data: "04/10/2026",
  melhorias: [
    "Notificações com os mesmos controles da web: Marcar todas como lidas e Marcar como lida.",
    "Leitura individual e em lote salva no aparelho, sem perder os avisos anteriores.",
  ],
};
const historico = IS_GERADOR_APP ? [
  atualizacaoAnterior,
  { numero: "1.0.0-r20261004.1", data: "04/10/2026", melhorias: [
    "Pedidos antigos de cancelamento não aparecem como pendentes em contratos substituídos.",
    "Nome e Sobrenome separados e obrigatórios nos cadastros de pessoas.",
    "Novos ícones para escolher usina e unidade consumidora.",
  ] },
  { numero: "1.0.0-r20261003.2", data: "03/10/2026", melhorias: [
    "Nova logo no carregamento e na fatura, com referência e vencimento alinhados.",
    "Endereço do locador com campos separados e validação antes de gerar a minuta.",
    "Correção de nomes com acentuação e histórico por aplicativo.",
  ] },
  { numero: "1.0.0-r20261003.1", data: "03/10/2026", melhorias: [
    "Importação da produção da usina por PDF, identificando a UC na carteira ativa.",
    "Cadastro com endereço completo e busca por CEP para cliente, gerador e usina.",
    "Faturamento automático com códigos de pagamento e progresso da emissão.",
  ] },
  { numero: "1.0.0-r20261001", data: "01/10/2026", melhorias: [
    "Ícones e identificação separados para os aplicativos Preview e produção.",
  ] },
] : [
  atualizacaoAnterior,
  { numero: "1.0.0-r20261004.1", data: "04/10/2026", melhorias: [
    "Logo centralizada na escolha da unidade consumidora.",
    "Nome e Sobrenome separados e obrigatórios no perfil.",
    "Novo ícone para escolher unidade consumidora.",
  ] },
  { numero: "1.0.0-r20261003.2", data: "03/10/2026", melhorias: [
    "Nova logo com animação de entrada no carregamento.",
    "Campos de endereço do perfil com espaçamento corrigido.",
    "Correção da exibição de nomes com acentuação e histórico por aplicativo.",
  ] },
  { numero: "1.0.0-r20261003.1", data: "03/10/2026", melhorias: [
    "Endereço completo no perfil e aproveitamento dos dados cadastrais no contrato.",
    "Identificação da versão e acesso às informações do aplicativo pelo menu.",
  ] },
  { numero: "1.0.0-r20261002", data: "02/10/2026", melhorias: [
    "Desconto da UC visível na lista de unidades consumidoras.",
  ] },
  { numero: "1.0.0-r20261001", data: "01/10/2026", melhorias: [
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
      <Card><Text style={styles.title}>Atualização atual · {atualizacaoAtual.numero}</Text><Text style={styles.date}>{atualizacaoAtual.data}</Text>{atualizacaoAtual.melhorias.map(texto => <View key={texto} style={styles.item}><Text style={styles.dot}>•</Text><Text style={[styles.text, { flex: 1 }]}>{texto}</Text></View>)}</Card>
      <Card><Text style={styles.title}>Histórico de atualizações</Text>{historico.map(versao => <View key={versao.numero} style={styles.release}><Text style={styles.releaseTitle}>{versao.numero}</Text><Text style={styles.date}>{versao.data}</Text>{versao.melhorias.map(texto => <View key={texto} style={styles.item}><Text style={styles.dot}>•</Text><Text style={[styles.text, { flex: 1 }]}>{texto}</Text></View>)}</View>)}</Card>
    </ElasticScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: 19, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  text: { fontSize: 14, lineHeight: 22, color: Colors.subtitle },
  date: { fontSize: 12, color: Colors.subtitle, marginBottom: 12 },
  release: { marginBottom: Spacing.md },
  releaseTitle: { fontSize: 15, color: Colors.text, fontWeight: "700", marginBottom: 4 },
  item: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dot: { color: Colors.primary, fontSize: 18 },
});
