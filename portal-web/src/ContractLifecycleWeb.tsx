import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiClient";
import { hasVerifiedSignature } from "./flowSafety";

export default function ContractLifecycleWeb({ apiUrl, token, contract, generator, onChanged }: {
  apiUrl: string; token: string; contract: Record<string, any>; generator: boolean; onChanged: () => void;
}) {
  const [request, setRequest] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false), [reload, setReload] = useState(0);
  const [date, setDate] = useState(""), [protocol, setProtocol] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [decision, setDecision] = useState("");
  const lock = useRef(false);
  const active = hasVerifiedSignature(contract) && ["ATIVO", "VIGENTE"].includes(String(contract.status));
  const noFidelity = (contract.configuracao_uc_snapshot?.plano_contrato ?? contract.dados_documento?.plano_contrato) === "SEM_FIDELIDADE";
  useEffect(() => {
    setRequest(null); setDecision(""); setMessage(""); setLoadFailed(false);
    if (!generator || !active) return;
    const controller = new AbortController();
    void apiFetch(`${apiUrl}/contratos/${contract.id}/cancelamento`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Falha ao consultar cancelamento."); if (!controller.signal.aborted) setRequest(data.solicitacao); })
      .catch(reason => { if (!controller.signal.aborted) { setLoadFailed(true); setMessage(reason.message); } });
    return () => controller.abort();
  }, [apiUrl, token, contract.id, generator, active, reload]);
  async function send(action: string, body: Record<string, any> = {}) {
    if (lock.current) return;
    if (!window.confirm(action === "cancelamento/concluir" ? "Confirma esta decisão de cancelamento? O encerramento exige desligamento efetivo na distribuidora." : "Confirma registrar esta escolha para esta UC?")) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${apiUrl}/contratos/${contract.id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível registrar. Consulte a situação antes de tentar novamente.");
      setDecision(action); setMessage(data.message ?? "Decisão registrada.");
      if (generator) setReload(value => value + 1);
      onChanged();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Falha de conexão. Confira a situação antes de repetir."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!active) return <section className="contract-lifecycle"><p>Contrato {String(contract.status ?? "não vigente").toLocaleLowerCase("pt-BR")}. Contratos encerrados não geram novas faturas automáticas para esta UC.</p></section>;
  const declined = Boolean(contract.dados_documento?.nao_renovar_informado_em || decision === "nao-renovar");
  return <section className="contract-lifecycle"><h3>Renovação e desligamento</h3><p>{noFidelity ? "Sem fidelidade: prazo indeterminado e aviso prévio de 90 dias." : "Contratos com prazo recebem aviso nos 30 dias finais. Renovar exige nova proposta e novo aceite."}</p>
    {!generator ? <div className="contract-actions">
      {!noFidelity && contract.vigencia_fim ? <><button disabled={busy || declined || Boolean(decision)} onClick={() => void send("solicitar-renovacao")}>Solicitar renovação para novo aceite</button><button disabled={busy || declined || Boolean(decision)} onClick={() => void send("nao-renovar")}>{declined ? "Não renovação registrada" : "Não renovar no vencimento"}</button></> : null}
      <button disabled={busy || Boolean(decision) || Boolean(contract.cancelamento_pendente)} onClick={() => void send("cancelar")}>Solicitar cancelamento</button>
      <p>O pedido não encerra imediatamente o contrato. O gerador deve confirmar a retirada da UC do rateio/injeção na distribuidora.</p>
    </div> : loadFailed ? <button onClick={() => setReload(value => value + 1)}>Consultar novamente</button> : request && ["PENDENTE", "PROCESSANDO"].includes(request.status) ? <div className="commercial-form">
      <p role="status">Pedido recebido. Providencie a retirada da UC do rateio/injeção na distribuidora. O contrato continua ativo até o desligamento efetivo.</p>
      {!request.aceito_em ? <div className="contract-actions"><button disabled={busy} onClick={() => void send("cancelamento/concluir", { decisao: "ACEITAR" })}>Aceitar e iniciar desligamento</button><button disabled={busy} onClick={() => void send("cancelamento/concluir", { decisao: "RECUSAR" })}>Recusar pedido</button></div> : <>
        <label>Data efetiva do desligamento<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>Protocolo da distribuidora<input value={protocol} onChange={event => setProtocol(event.target.value)} /></label>
        <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo que a distribuidora concluiu o desligamento desta UC.</label>
        <button disabled={busy || !confirmed || !date || !protocol.trim()} onClick={() => void send("cancelamento/concluir", { decisao: "CANCELAR", desligamento: { confirmado: confirmed, data: date, protocolo: protocol.trim() } })}>Confirmar desligamento e encerrar contrato</button>
      </>}
    </div> : <p>Nenhum pedido de desligamento pendente.</p>}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
