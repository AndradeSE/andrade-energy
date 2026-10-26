export type EtapaInicialCemig='ARQUIVO'|'PROVEDOR'|'CONEXAO'|'SESSAO'|'PORTAL'|'VISUALIZADOR'|'VALIDACAO';

/** Static messages only: provider errors can contain private URLs and credentials. */
export function mensagemFalhaCemig(etapa:EtapaInicialCemig):string {
 const detalhes:Record<EtapaInicialCemig,string>={
  ARQUIVO:'Não foi possível preparar o arquivo da simulação.',
  PROVEDOR:'Não foi possível criar o navegador em nuvem. Confira a cota e a configuração do provedor.',
  CONEXAO:'O navegador foi solicitado, mas a conexão de controle não foi estabelecida.',
  SESSAO:'Não foi possível preparar a sessão protegida do navegador.',
  PORTAL:'O navegador abriu, mas a página oficial da Cemig não terminou de abrir.',
  VISUALIZADOR:'A página foi aberta, mas o visualizador da sessão não ficou disponível.',
  VALIDACAO:'A simulação não chegou à revisão do arquivo.',
 };
 return `${detalhes[etapa]} Nenhum protocolo foi solicitado. Nenhuma nova tentativa será iniciada automaticamente.`;
}
