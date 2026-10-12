import { apiFetch as fetch } from "./apiClient";
import { useEffect, useRef, useState } from "react";
type Connection = { id?: unknown; provedor?: unknown; email_conectado?: unknown; email?: unknown; status?: unknown; regra_status?: unknown; regra_erro?: unknown; conectado?: unknown };
export function emailConnectionStatus(connection: Connection): string {
  if (connection.status === "REGRA_ATIVA" && connection.regra_status === "ATIVA") return "Conectado · encaminhamento ativo";
  if (connection.status === "LEITURA_AUTORIZADA") return "Conectado · leitura autorizada";
  if (connection.regra_status === "ERRO") return "Conectado · falha na regra de encaminhamento";
  if (connection.status === "CONECTADO_SEM_REGRA") return "Conectado · encaminhamento não configurado";
  if (connection.status === "ERRO" || connection.status === "EXPIRADO") return "Reconexão necessária";
  return "Verifique a autorização";
}
function GmailLogo() { return <svg className="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M2 6v14h4V9z"/><path fill="#34a853" d="M18 9v11h4V6z"/><path fill="#ea4335" d="M2 6l10 8L22 6v-2l-4 3-6 5-6-5-4-3z"/><path fill="#fbbc04" d="M18 7l4-3v2l-4 3z"/><path fill="#c5221f" d="M2 4l4 3v2L2 6z"/></svg>; }
function OutlookLogo() { return <svg className="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#50b9ff" d="M8 3h13v17H8z"/><path fill="#fff" d="M8 8l7 5 6-5v2l-6 5-7-5z"/><path fill="#005a9e" d="M1 5l12-2v19L1 20z"/><text x="3" y="16" fill="white" fontSize="12" fontFamily="Arial" fontWeight="bold">O</text></svg>; }
export default function EmailProviderSetupWeb({ apiUrl, token, unitId, accessType, connections, reload }: { apiUrl: string; token: string; unitId: string; accessType: "GERADOR" | "CONSUMIDOR"; connections: Connection[]; reload: () => Promise<void> }) {
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const pendingState = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true; generation.current++; inFlight.current = false; setBusy(false); setMessage("");
    return () => { mounted.current = false; generation.current++; inFlight.current = false; pendingState.current = null; requestController.current?.abort(); if (pollingTimer.current) clearTimeout(pollingTimer.current); };
  }, [token, unitId]);
  async function request(path: string, method: string, body?: unknown) {
    requestController.current = new AbortController();
    const response = await fetch(`${apiUrl}/conexoes-email/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: requestController.current.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message ?? "Não foi possível configurar a conexão.");
    return data;
  }
  async function connect(provider: "GMAIL" | "OUTLOOK") {
    if (inFlight.current) return;
    const scope = generation.current;
    const popup = window.open("about:blank", "_blank");
    if (!popup) { setMessage("Permita a abertura de uma nova aba para autorizar o e-mail."); return; }
    popup.opener = null;
    popup.document.title = "Conectar e-mail — Andrade Energy";
    popup.document.body.textContent = "Preparando autorização segura…";
    inFlight.current = true; setBusy(true); setMessage("");
    try {
      const data = await request(`unidades/${encodeURIComponent(unitId)}/iniciar`, "POST", { provedor: provider, app: accessType, origem: "WEB" });
      if (!mounted.current || generation.current !== scope) { popup.close(); return; }
      const url = new URL(String(data.url));
      if (url.protocol !== "https:" || !["accounts.google.com", "login.microsoftonline.com", "login.live.com"].includes(url.hostname) || typeof data.state !== "string" || !/^web_[A-Za-z0-9_-]{43}$/.test(data.state)) throw new Error("O servidor retornou uma autorização inválida.");
      popup.location.href = url.toString(); pendingState.current = data.state;
      setMessage("Conclua a autorização na nova aba e volte ao portal. Aguardando confirmação…");
      const deadline = Date.now() + 15 * 60_000;
      async function poll() {
        if (!mounted.current || generation.current !== scope || pendingState.current !== data.state) return;
        if (Date.now() >= deadline) { pendingState.current = null; inFlight.current = false; setBusy(false); setMessage("A autorização expirou. Conecte novamente."); return; }
        try {
          const result = await request("concluir", "POST", { state: data.state });
          if (!mounted.current || generation.current !== scope || pendingState.current !== data.state) return;
          if (result.pronto === true) { pendingState.current = null; inFlight.current = false; setBusy(false); setMessage(result.conexao ? emailConnectionStatus(result.conexao) : "Autorização confirmada."); await reload(); return; }
          if (["ERRO", "EXPIRADO"].includes(result.status)) throw new Error(result.message ?? "Não foi possível concluir a conexão.");
          pollingTimer.current = setTimeout(() => void poll(), 3000);
        } catch (reason) {
          if (!mounted.current || generation.current !== scope) return;
          pendingState.current = null; inFlight.current = false; setBusy(false); setMessage(reason instanceof Error ? reason.message : "Não foi possível confirmar a conexão.");
        }
      }
      pollingTimer.current = setTimeout(() => void poll(), 2000);
    } catch (reason) { popup.close(); if (mounted.current && generation.current === scope) { inFlight.current = false; setBusy(false); setMessage(reason instanceof Error ? reason.message : "Não foi possível conectar."); } }
  }
  async function disconnect(id: string) {
    if (inFlight.current) return;
    const scope = generation.current;
    if (!window.confirm("Desconectar este e-mail e remover sua automação de recebimento?")) return;
    inFlight.current = true; setBusy(true); setMessage("");
    try { const data = await request(encodeURIComponent(id), "DELETE"); await reload(); if (mounted.current && generation.current === scope) setMessage(data.aviso ?? data.message ?? "E-mail desconectado."); }
    catch (reason) { if (mounted.current && generation.current === scope) setMessage(reason instanceof Error ? reason.message : "Não foi possível desconectar."); }
    finally { if (mounted.current && generation.current === scope) { inFlight.current = false; setBusy(false); } }
  }
  return <div><p>Conecte a conta que recebe as faturas da concessionária.</p><div className="email-provider-actions">
    <button className="provider-gmail" disabled={busy} type="button" onClick={() => void connect("GMAIL")}><GmailLogo/>Conectar Gmail</button>
    <button className="provider-outlook" disabled={busy} type="button" onClick={() => void connect("OUTLOOK")}><OutlookLogo/>Conectar Hotmail / Outlook</button>
    <button className="provider-manual" type="button" aria-expanded={manual} onClick={() => setManual(current => !current)}>Configuração manual {manual ? "⌃" : "⌄"}</button>
  </div>{manual ? <ol><li>Crie uma regra na conta que recebe os PDFs da concessionária.</li><li>Encaminhe as mensagens para o endereço exclusivo acima.</li><li>Confira o resultado na UC identificada no documento.</li></ol> : null}
  {connections.length ? <div className="automatic-connections">{connections.map(connection => <article key={String(connection.id)}><strong>{String(connection.provedor ?? "E-mail")} · {String(connection.email_conectado ?? connection.email ?? "")}</strong><span>{emailConnectionStatus(connection)}</span>{connection.regra_erro ? <small>{String(connection.regra_erro)}</small> : null}{connection.id ? <button disabled={busy} type="button" onClick={() => void disconnect(String(connection.id))}>Desconectar</button> : null}</article>)}</div> : null}
  {message ? <p role="status" className="automatic-message">{message}</p> : null}
  {pendingState.current ? <button type="button" onClick={() => { pendingState.current = null; inFlight.current = false; generation.current++; requestController.current?.abort(); if (pollingTimer.current) clearTimeout(pollingTimer.current); setBusy(false); setMessage("Espera cancelada. A autorização no provedor pode ser retomada conectando novamente."); }}>Cancelar espera</button> : null}
  </div>;
}
