import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, ElasticScrollView, Screen } from "../components/ui";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../config/appVariant";
import { Colors, Spacing } from "../theme";
const geradorPreview = IS_GERADOR_APP && (Constants.expoConfig?.extra?.appEnvironment === "preview" || Updates.channel?.startsWith("preview"));
const previewApp = Constants.expoConfig?.extra?.appEnvironment === "preview" || Updates.channel?.startsWith("preview");
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
const atualizacaoConversaContinua = {
  numero: "1.0.0-r20261006.5", data: "06/10/2026",
  melhorias: ["Conversa por voz usa o modelo local nas perguntas comuns, responde falando e volta a ouvir automaticamente; dados financeiros seguem consulta autenticada."],
};
const atualizacaoVozAnterior = {
  numero: "1.0.0-r20261006.6", data: "06/10/2026",
  melhorias: [
    "Voz pt-BR de maior qualidade priorizada quando disponível no aparelho, com alternativa local.",
    "Conversa inicia com saudação pelo primeiro nome e ondas animadas durante fala e resposta.",
    "Ditado aguarda a transcrição final ao soltar o microfone e prepara o reconhecimento ao abrir a ajuda.",
  ],
};
const atualizacaoGeminiAnterior = {
  numero: "1.0.0-r20261006.7", data: "06/10/2026",
  melhorias: [
    "Ajuda online do Gemini priorizada para assuntos públicos do app; valores e documentos continuam na consulta autenticada.",
    "Reconhecimento de voz em português pelo Android quando o idioma está instalado, com alternativa offline.",
    "Botão flutuante inicia logo acima da barra inferior e continua disponível para arrastar.",
    "Processamento pesado deixa de iniciar automaticamente ao abrir a ajuda.",
  ],
};
const atualizacaoConversaGeminiAnterior = {
  numero: "1.0.0-r20261006.8", data: "06/10/2026",
  melhorias: [
    "Gemini recebe a pergunta e o contexto recente autorizado para responder à conversa, não apenas ao assunto.",
    "Consultas de faturas e financeiro ficam separadas do histórico enviado ao Gemini.",
    "Falhas do Gemini são informadas, sem substituição silenciosa pela IA local.",
  ],
};
const atualizacaoOndasAnterior = {
  numero: "1.0.0-r20261006.9", data: "06/10/2026",
  melhorias: [
    "Botão de conversa mantém a cor normal e indica fala pelas ondas animadas.",
    "Perguntas sobre escuta confirmam a transcrição recebida, sem depender do Gemini.",
    "Falhas mostram o motivo da conexão e não reproduzem áudio genérico de segurança.",
  ],
};
const atualizacaoVozPublicaAnterior = {
  numero: "1.0.0-r20261006.10", data: "06/10/2026",
  melhorias: [
    "Respostas públicas do Gemini passam a solicitar a mesma voz natural online da saudação.",
    "Falhas da voz online são informadas antes de usar a voz do aparelho.",
    "Dados privados continuam no aparelho; respostas válidas longas deixam de virar erro de conexão.",
  ],
};
const atualizacaoConsultasAnterior = {
  numero: "1.0.0-r20261006.11", data: "06/10/2026",
  melhorias: [
    "Assistente consulta produção, energia disponível, acumulado e ocupação da usina selecionada.",
    "PDFs de faturas podem ser pedidos por competência e abertos diretamente no chat.",
    "Pedidos com várias faturas mostram documentos para escolher; dados privados não entram no histórico online.",
  ],
};
const atualizacaoModulosAnterior = {
  numero: "1.0.0-r20261006.12", data: "06/10/2026",
  melhorias: [
    "Consultas autenticadas de clientes, usinas, UCs, registros de contratos e notificações no assistente.",
    "Produção, financeiro e PDFs de faturas disponíveis no chat, respeitando a carteira selecionada e as permissões.",
    "Dados privados não são enviados ao Gemini; operações de alteração continuam nas telas de confirmação do aplicativo.",
  ],
};
const atualizacaoDocumentosAnterior = {
  numero: "1.0.0-r20261006.13", data: "06/10/2026",
  melhorias: [
    "Assistente ampliado para carteira, economia, equipe, operação, inversores, planos, perfil e recebimento automático.",
    "Contratos, propostas, contas de luz, anexos e relatórios de cálculo podem ser abertos no chat conforme o acesso.",
    "Comandos de alteração abrem as telas de revisão sem executar cobranças, pagamentos ou assinaturas silenciosamente.",
    "Voz natural dos dados com autorização individual revogável; limite do Google é informado sem trocar para a voz sintética.",
    "Histórico da conversa é limpo ao trocar conta, ambiente, usina ou UC.",
  ],
};
const atualizacaoFaturasAnterior = {
  numero: "1.0.0-r20261006.15", data: "06/10/2026",
  melhorias: ["Consultas de faturas atrasadas e boletos vencidos usam os registros da conta, com PDFs disponíveis no chat.", "Ao atingir o limite da voz natural, a conversa usa temporariamente a voz do aparelho e tenta a natural novamente depois."],
};
const atualizacaoAzureAnterior = {
  numero: "1.0.0-r20261006.16", data: "06/10/2026",
  melhorias: ["Voz neural Microsoft Azure Free F0 como segunda opção após o Google; voz do aparelho fica por último.", "Nova autorização individual para enviar textos com nomes e valores aos provedores de voz; PDFs, senhas e códigos não são enviados."],
};
const atualizacaoAtivacaoAnterior = {
  numero: "1.0.0-r20261006.17", data: "06/10/2026",
  melhorias: ["Ativação opcional por “E aí, chat” com o app aberto e reconhecimento offline em português compatível.", "A frase abre a conversa por voz. Escuta pausada no chat, em carregamentos e em segundo plano, com indicador para desligar e encerramento ao sair da conta."],
};
const atualizacaoMicrofoneAnterior = {
  numero: "1.0.0-r20261006.18", data: "06/10/2026",
  melhorias: ["“E aí, chat” responde também à fala parcial e reinicia a escuta após tentativas sem resultado final.", "Ativação no chat em silêncio, bip curto ao iniciar e encerramento da conversa após 30 segundos sem fala.", "Pedido do arquivo do último faturamento reconhecido como consulta do PDF, sem criar cobrança."],
};
const atualizacaoReconhecedorAnterior = {
  numero: "1.0.0-r20261006.19", data: "06/10/2026",
  melhorias: ["Verificação de português usa o mesmo reconhecedor offline do Android que abre o microfone, com limite de espera e nova tentativa após falha.", "Escutas antigas deixam de fechar o microfone da transcrição ou da conversa. A interface confirma a abertura pelo evento de áudio e informa erros específicos de permissão ou idioma."],
};
const atualizacaoInicioDiretoAnterior = {
  numero: "1.0.0-r20261006.20", data: "06/10/2026",
  melhorias: ["Ativação, transcrição e conversa tentam abrir o reconhecedor offline diretamente, sem depender da consulta de idiomas que falha em alguns serviços Android.", "A captura precisa iniciar em até 8 segundos; erros de idioma, acesso ao microfone ou captura de áudio são informados sem enviar a escuta à nuvem."],
};
const atualizacaoLoopAnterior = {
  numero: "1.0.0-r20261006.21", data: "06/10/2026",
  melhorias: ["Ativação só aparece como ativa depois que o Android confirma a abertura do microfone.", "Tentativas encerradas antes da captura não reiniciam indefinidamente. A ativação pendente tem prazo global de 10 segundos e pode ser cancelada."],
};
const atualizacaoOndasFlutuantesAnterior = {
  numero: "1.0.0-r20261006.22", data: "06/10/2026",
  melhorias: ["Aviso de escuta removido do topo. O botão flutuante mostra ondas verdes animadas somente quando o microfone está ativo.", "Atalho mantém o arraste, aparece no chat durante a escuta ativa e fica oculto nos carregamentos."],
};
const atualizacaoProntidaoAnterior = {
  numero: "1.0.0-r20261006.23", data: "06/10/2026",
  melhorias: ["Escuta aguarda a confirmação de prontidão do reconhecedor Android, não apenas o pedido de abertura do áudio.", "Permissão do microfone tem limite de espera. Ativação pausada durante conversa é distinguida de uma tentativa de início."],
};
const atualizacaoAtual = geradorPreview ? {
  numero: "1.0.0-r20261008.3", data: "08/10/2026",
  melhorias: ["Ao tocar no botão flutuante, a conversa abre com saudação falada; o comando “Andrade” continua indo direto à pergunta.", "Picos isolados de ruído não são mais enviados como perguntas para a transcrição."],
} : previewApp ? {
  numero: "1.0.0-r20261006.24", data: "06/10/2026",
  melhorias: ["Ativação, ditado e conversa usam reconhecimento local já instalado quando o motor Android falha ou não fica pronto.", "Sem envio do áudio à nuvem ou download implícito. A captura alternativa não muda o provedor da voz natural das respostas."],
} : atualizacaoTutoriais;
const historico = IS_GERADOR_APP ? [
  ...(geradorPreview ? [{ numero: "1.0.0-r20261008.2", data: "08/10/2026", melhorias: ["Botão flutuante abre a conversa e a espera máxima por trecho de fala foi reduzida para 10 segundos."] }] : []),
  ...(geradorPreview ? [{ numero: "1.0.0-r20261008.1", data: "08/10/2026", melhorias: ["Comando opcional alterado para a palavra isolada “Andrade”; citações da marca em frases não ativam a conversa."] }] : []),
  ...(geradorPreview ? [{ numero: "1.0.0-r20261006.24", data: "06/10/2026", melhorias: ["Ativação, ditado e conversa usam reconhecimento local já instalado quando o motor Android falha ou não fica pronto.", "Sem envio do áudio à nuvem ou download implícito."] }] : []),
  ...(previewApp ? [atualizacaoProntidaoAnterior, atualizacaoOndasFlutuantesAnterior, atualizacaoLoopAnterior, atualizacaoInicioDiretoAnterior, atualizacaoReconhecedorAnterior, atualizacaoMicrofoneAnterior, atualizacaoAtivacaoAnterior, atualizacaoAzureAnterior, atualizacaoFaturasAnterior, atualizacaoDocumentosAnterior] : []),
  ...(previewApp ? [atualizacaoModulosAnterior, atualizacaoConsultasAnterior, atualizacaoVozPublicaAnterior, atualizacaoOndasAnterior, atualizacaoConversaGeminiAnterior, atualizacaoGeminiAnterior] : []),
  ...(geradorPreview ? [atualizacaoVozAnterior] : []),
  ...(geradorPreview ? [atualizacaoConversaContinua, atualizacaoVozNatural, atualizacaoFaturamentoAutomatico, atualizacaoAtalhosFaturamento, atualizacaoChat, atualizacaoVozPdf, atualizacaoSolEletrico, atualizacaoAssistente, atualizacaoTutoriais] : []),
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
  ...(previewApp ? [atualizacaoProntidaoAnterior, atualizacaoOndasFlutuantesAnterior, atualizacaoLoopAnterior, atualizacaoInicioDiretoAnterior, atualizacaoReconhecedorAnterior, atualizacaoMicrofoneAnterior, atualizacaoAtivacaoAnterior, atualizacaoAzureAnterior, atualizacaoFaturasAnterior, atualizacaoDocumentosAnterior] : []),
  ...(previewApp ? [atualizacaoModulosAnterior, atualizacaoConsultasAnterior, atualizacaoVozPublicaAnterior, atualizacaoOndasAnterior, atualizacaoConversaGeminiAnterior, atualizacaoGeminiAnterior] : []),
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
