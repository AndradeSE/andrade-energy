import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, ElasticScrollView, Screen } from "../components/ui";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../config/appVariant";
import { Colors, Spacing } from "../theme";
const geradorPreview = IS_GERADOR_APP && (Constants.expoConfig?.extra?.appEnvironment === "preview" || Updates.channel?.startsWith("preview"));
const atualizacaoAnterior = {
  numero: "1.0.0-r20261004.2", data: "04/10/2026",
  melhorias: IS_GERADOR_APP ? [
    "Logo animada na abertura, com lâmpada e cabo iluminados até o app ficar pronto.",
    "Quantidade de UCs vinculadas exibida no card de cada cliente.",
  ] : [
    "Logo animada na abertura, com lâmpada e cabo iluminados até o app ficar pronto.",
  ],
};
const atualizacaoNotificacoes = {
  numero: "1.0.0-r20261004.3", data: "04/10/2026",
  melhorias: [
    "Notificações com os mesmos controles da web: Marcar todas como lidas e Marcar como lida.",
    "Leitura individual e em lote salva no aparelho, sem perder os avisos anteriores.",
  ],
};
const atualizacaoTutoriaisAnterior = {
  numero: "1.0.0-r20261004.4", data: "04/10/2026",
  melhorias: IS_GERADOR_APP ? [
    "Tutoriais de faturamento, cancelamento, renovação, Pix, planos e empresas revisados com dados pessoais desfocados.",
    "Setas redesenhadas, voz nivelada entre os passos e música de fundo mais audível.",
  ] : [
    "Tutoriais de cancelamento e revisão do contrato com desfoque de dados pessoais e marcações revistas.",
    "Navegação do cancelamento sincronizada com a fala e menor espera na abertura da revisão.",
    "Voz nivelada e música de fundo mais audível.",
  ],
};
const atualizacaoSetasAnterior = {
  numero: "1.0.0-r20261005.1", data: "05/10/2026",
  melhorias: [
    "Setas curvas vermelhas preenchidas nos tutoriais, com entrada suave e ponta fixa no controle indicado.",
    "Imagem do portal restaurada atrás da logo na abertura, preservando a animação e o rodapé discreto.",
  ],
};
const atualizacaoCarregamentoPreview = {
  numero: "1.0.0-r20261005.2", data: "05/10/2026",
  melhorias: [
    "Pré-carregamento das abas deixa de bloquear a entrada quando uma consulta demora.",
    "Proteção contra animação inicial interrompida e consultas de usinas sem resposta.",
  ],
};
const atualizacaoTutoriaisFluidos = {
  numero: "1.0.0-r20261005.3", data: "05/10/2026",
  melhorias: [
    "Pausas estáticas encurtadas nos tutoriais, preservando a narração e as ações reais.",
    "Setas vermelhas com cabeça triangular nítida e bordas suaves, sem ponta arredondada.",
    "Duração dos vídeos atualizada no catálogo; música e dados pessoais desfocados preservados.",
  ],
};
const atualizacaoSelecaoUsina = {
  numero: "1.0.0-r20261005.5", data: "05/10/2026",
  melhorias: [
    "Entrada nas abas valida a usina salva na conta atual; seleção antiga ou inexistente retorna à lista.",
    "Sem usina selecionada, Início e Financeiro abrem a lista para escolher ou cadastrar uma usina.",
    "Falha na Home permite escolher outra usina ou tentar novamente, sem ficar presa no aviso.",
  ],
};
const atualizacaoTutoriais = {
  numero: "1.0.0-r20261005.6", data: "05/10/2026",
  melhorias: ["Tutorial de faturamento orienta localizar o atalho pelo nome, pois sua posição é personalizável."],
};
const atualizacaoAssistente = {
  numero: "1.0.0-r20261005.7", data: "05/10/2026",
  melhorias: [
    "Ajuda local ampliada para cadastros, usinas, UCs, faturamento, contratos e perfil, com linguagem mais cordial.",
    "Consulta autenticada da última fatura e de indicadores financeiros, sem estimar valores.",
    "Sol 3D de óculos escuros pode ser arrastado pela tela e desaparece durante o carregamento.",
  ],
};
const atualizacaoSolEletrico = {
  numero: "1.0.0-r20261005.8", data: "05/10/2026",
  melhorias: ["Sol 3D ganhou aura dourada pulsante e relâmpagos azulados animados no Gerador Preview."],
};
const atualizacaoVozPdf = {
  numero: "1.0.0-r20261005.9", data: "05/10/2026",
  melhorias: [
    "Microfone envia a pergunta ao soltar; conversa por voz retoma a escuta após responder.",
    "A última fatura emitida pode ser aberta como PDF diretamente na conversa quando o documento está disponível.",
    "Quando não há PDF, a ajuda explica a ausência do arquivo sem repetir instruções de navegação.",
  ],
};
const atualizacaoChat = {
  numero: "1.0.0-r20261006.1", data: "06/10/2026",
  melhorias: ["Botão flutuante da IA redesenhado como chat 3D verde e dourado, com animação suave e sem a antiga aura elétrica."],
};
const atualizacaoAtalhosFaturamento = {
  numero: "1.0.0-r20261006.2", data: "06/10/2026",
  melhorias: ["Atalho de recebimento automático da usina mantido somente no card de geração da Home; Faturas renomeado para Faturas emitidas na aba Faturamento."],
};
const atualizacaoFaturamentoAutomatico = {
  numero: "1.0.0-r20261006.3", data: "06/10/2026",
  melhorias: ["Opção de recebimento de contas renomeada para Faturamento automático na aba Faturamento."],
};
const atualizacaoVozNatural = {
  numero: "1.0.0-r20261006.4", data: "06/10/2026",
  melhorias: [
    "Conversa por voz prioriza a melhor voz pt-BR instalada no aparelho.",
    "Ajuda reconhece pequenos erros de digitação em termos do app e pede esclarecimento quando a pergunta fica ambígua.",
  ],
};
const atualizacaoAtual = geradorPreview ? {
  numero: "1.0.0-r20261006.5", data: "06/10/2026",
  melhorias: ["Conversa por voz usa o modelo local nas perguntas comuns, responde falando e volta a ouvir automaticamente; dados financeiros seguem consulta autenticada."],
} : atualizacaoTutoriais;
const historico = IS_GERADOR_APP ? [
  ...(geradorPreview ? [atualizacaoVozNatural, atualizacaoFaturamentoAutomatico, atualizacaoAtalhosFaturamento, atualizacaoChat, atualizacaoVozPdf, atualizacaoSolEletrico, atualizacaoAssistente, atualizacaoTutoriais] : []),
  atualizacaoSelecaoUsina,
  atualizacaoTutoriaisFluidos,
  atualizacaoCarregamentoPreview,
  atualizacaoSetasAnterior,
  atualizacaoTutoriaisAnterior,
  atualizacaoNotificacoes,
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
  atualizacaoSetasAnterior,
  atualizacaoTutoriaisAnterior,
  atualizacaoNotificacoes,
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
  const ambiente = Constants.expoConfig?.extra?.appEnvironment === "preview" || Updates.channel?.startsWith("preview") ? "Preview / homologação" : "Produção";
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
