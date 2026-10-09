type PrivacyRequest = { id: string; criado_em: string; detalhes?: { tipo?: string; status?: string }; usuarios?: { nome?: string; email?: string } };
const labels: Record<string, string> = { ACESSO: "Acesso aos dados", CORRECAO: "Correção de dados", EXCLUSAO: "Exclusão de dados", PORTABILIDADE: "Portabilidade", COMPARTILHAMENTO: "Compartilhamento", REVOGACAO_CONSENTIMENTO: "Revogação de consentimento", INFORMACAO: "Informações", RECEBIDA: "Recebido", EM_ANALISE: "Em análise", CONCLUIDA: "Concluído", NEGADA: "Não atendido" };
export default function PrivacyRequestsWeb({ requests, received = false }: { requests: PrivacyRequest[]; received?: boolean }) {
  if (!requests.length) return null;
  return <details className="section-workspace profile-card privacy-requests-web">
    <summary><span><small>{received ? "ATENDIMENTO DE PRIVACIDADE" : "ACOMPANHAMENTO"}</small><strong>{received ? "Pedidos de privacidade recebidos" : "Meus pedidos de privacidade"}</strong></span><b>{requests.length}</b></summary>
    <div>{requests.map(request => <article key={request.id}>
      <header><strong>{labels[request.detalhes?.tipo ?? ""] ?? "Pedido de privacidade"}</strong><span>{labels[request.detalhes?.status ?? "RECEBIDA"] ?? request.detalhes?.status?.replaceAll("_", " ")}</span></header>
      {received ? <p>{request.usuarios?.nome ?? "Titular"}{request.usuarios?.email ? ` · ${request.usuarios.email}` : ""}</p> : null}
      <time dateTime={request.criado_em}>{new Date(request.criado_em).toLocaleDateString("pt-BR")}</time><small>Protocolo <code>{request.id}</code></small>
    </article>)}</div>
  </details>;
}
