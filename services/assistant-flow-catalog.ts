import type { AssistantModule } from "./assistant-capabilities";

export const SOLAR_FLOW_CATALOG: Record<AssistantModule, string> = {
  clientes: "Pesquisar na usina atual; consultar nome, e-mail, telefone, WhatsApp e endereço por cliente ou UC; abrir ficha e cadastro.",
  unidades: "Consultar UCs e consumo médio mensal cadastrado por nome do cliente, UC completa ou final; abrir configuração. Média cadastrada não é consumo da última fatura.",
  usinas: "Listar usinas autorizadas; consultar indicadores da usina selecionada. Não trocar a seleção por suposição.",
  faturamento: "Listar faturas autorizadas; abrir faturamento manual ou importação para revisão.",
  "conta-luz": "Consultar consumo e dados Cemig por UC e competência; abrir PDF disponível. Usar cliente cadastrado, não titular da conta.",
  contratos: "Localizar por cliente ou final da UC; abrir PDF e consultar trechos. Abrir contrato significa mostrar documento, salvo pedido explícito pela lista. Nunca assinar.",
  proposta: "Abrir propostas disponíveis sem enviar convite ou registrar aceite.",
  calculo: "Abrir memória de cálculo da fatura autorizada.",
  anexos: "Consultar anexos do cliente e abrir arquivos. Solicitar nova UC abre formulário para revisão.",
  leituras: "Consultar histórico e protocolo da UC. Recebida não significa protocolada. Abrir leitura apenas para UC elegível.",
  cotas: "Consultar cotas e limites por serviço quando administrador. Leitura indisponível não significa saldo zero.",
  operacao: "Consultar fechamentos da usina; abrir Operação ou Rateio no contexto atual. Automação exige revisão; só confirmar protocolo registrado.",
  economia: "Consultar economia e créditos; calcular estimativas com calculadora integrada sem inventar tarifas.",
  carteira: "Consultar saldo disponível, pendente e recebimentos. Nunca executar pagamento, saque ou transferência.",
  equipe: "Consultar colaboradores e convites; abrir equipe sem ampliar permissões.",
  atividade: "Consultar auditoria e atividades autorizadas.",
  recebimento: "Consultar recebimento automático e conexões da UC ou geradora; alterações pelo fluxo próprio.",
  inversores: "Consultar inversores da usina e abrir monitoramento.",
  assinatura: "Consultar plano, situação, ciclo e vencimento sem contratar ou assinar.",
  termos: "Consultar documentos e versões sem registrar aceite.",
  empresas: "Listar ambientes autorizados e abrir seleção.",
  comercial: "Consultar painel comercial quando administrador e abrir fluxos permitidos.",
  perfil: "Consultar perfil; preparar alterações suportadas com antes/depois e confirmação.",
  privacidade: "Consultar pedidos e abrir perfil sem excluir dados automaticamente.",
  pagamento: "Consultar opções e beneficiário da fatura sem executar pagamento.",
  "assistente-config": "Abrir preferências; respeitar autorizações separadas de voz e dados.",
  tutoriais: "Tutoriais desativados; explicar fluxos na conversa.",
  sobre: "Abrir versão e histórico de atualizações.",
};

export function solarFlowInstructions() {
  return "Use consultar_conta com o pedido exato para executar as funções abaixo. Não diga que não tem acesso ao app antes de consultar a ferramenta. Use a usina/UC selecionada. Só peça identificação quando houver ambiguidade ou nenhum alvo encontrado. Confirme pelo retorno real, sem inventar sucesso.\n" +
    Object.entries(SOLAR_FLOW_CATALOG).map(([module, flow]) => `${module}: ${flow}`).join("\n");
}
