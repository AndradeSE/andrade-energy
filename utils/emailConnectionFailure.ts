export function emailConnectionFailure(error: any) {
  const message = String(error?.response?.data?.message ?? error?.message ?? "");
  return /sem permiss[aã]o para ler as faturas|GMAIL_LEITURA_NAO_AUTORIZADA/i.test(message) ? "gmail-leitura" : "oauth";
}
export function emailConnectionFailureMessage(code: unknown) {
  return code === "gmail-leitura"
    ? "O Google não concedeu a leitura dos e-mails. Tente conectar novamente e marque a permissão de ler os e-mails do Gmail na tela do Google. Sem essa permissão, o faturamento automático não pode importar as contas."
    : "A autorização não foi concluída. Conclua todas as etapas no navegador e tente novamente. Nenhuma conexão foi confirmada.";
}
