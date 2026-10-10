import { apiFetch as fetch } from "./apiClient";
import { FormEvent, useEffect, useRef, useState } from "react";
import "./web-improvements.css";
import { accountIntent, answerAccountQuestion, type WebAssistantContext } from "./assistantAccountWeb";
import { planSolarFlow, solarTopic, type SolarFlow } from "./assistantFlows";
import { createAutomationExecutor, parseAutomationCommand, prepareAutomation, type AutomationDraft, type AutomationContext } from "./assistantAutomation";
type Message = { role: "user" | "model"; text: string; answerId?: string; private?: boolean; section?: string };
export default function SolarAssistantWeb({ apiUrl, token, variant, context, onNavigate, onFlow, onChanged }: { apiUrl: string; token: string; variant: "CONSUMIDOR" | "GERADOR"; context: WebAssistantContext; onNavigate: (section: string) => void; onFlow: (flow: SolarFlow) => Promise<string> | string; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [draft, setDraft] = useState<AutomationDraft | null>(null);
  const executeAutomation = useRef(createAutomationExecutor());
  const automationScope = useRef(context.scope);
  automationScope.current = context.scope;
  const controller = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const active = useRef(true);
  const submitting = useRef(false);
  const acceptingAudio = useRef(false);
  const mediaGeneration = useRef(0);
  const microphoneSupported = typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  function stopMedia() {
    mediaGeneration.current += 1;
    acceptingAudio.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    audio.current?.pause();
    if (audio.current?.src.startsWith("blob:")) URL.revokeObjectURL(audio.current.src);
    audio.current = null;
  }
  useEffect(() => {
    active.current = true;
    function hidden() { if (document.hidden) { stopMedia(); setRecording(false); setVoiceBusy(false); } }
    document.addEventListener("visibilitychange", hidden);
    return () => { active.current = false; controller.current?.abort(); stopMedia(); document.removeEventListener("visibilitychange", hidden); };
  }, [token]);
  useEffect(() => { setDraft(null); }, [context.scope]);
  useEffect(() => {
    if (!draft) return;
    const timeout = setTimeout(() => setDraft(current => current === draft ? null : current), Math.max(0, draft.preparedAt + 300_000 - Date.now()));
    return () => clearTimeout(timeout);
  }, [draft]);
  function automationContext(): AutomationContext {
    if (!context.scope) throw new Error("Não foi possível confirmar o ambiente da conta.");
    return { variant, scope: context.scope, allowedSections: context.allowedSections ?? [], plantId: context.plantId };
  }
  function automationIO(signal?: AbortSignal) {
    const expectedScope = context.scope;
    const send = async (path: string, method = "GET", body?: Record<string, unknown>) => {
      const response = await fetch(`${apiUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "Não foi possível concluir a operação. Consulte o cadastro antes de repetir.");
      return data;
    };
    return { get: (path: string) => send(path), change: (path: string, method: "PUT" | "PATCH", body: Record<string, unknown>) => send(path, method, body), isCurrent: () => active.current && automationScope.current === expectedScope };
  }
  async function confirmAutomation() {
    if (!draft || submitting.current || busy || recording) return;
    submitting.current = true; setBusy(true); setError("");
    const confirmed = draft;
    setDraft(null); // A lost response cannot leave a repeatable confirmation button.
    try {
      await executeAutomation.current(confirmed, automationContext(), automationIO());
      if (active.current && automationScope.current === confirmed.scope) {
        setMessages(current => [...current, { role: "model", private: true, text: `Alteração salva em ${confirmed.targetLabel}: ${confirmed.command.field} = ${confirmed.command.value}.`, section: confirmed.section }]);
        onChanged?.();
      }
    } catch (reason) { if (active.current && automationScope.current === confirmed.scope) setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração. Consulte o cadastro antes de repetir."); }
    finally { submitting.current = false; if (active.current) setBusy(false); }
  }
  async function request(path: string, body: unknown, signal?: AbortSignal) {
    const response = await fetch(`${apiUrl}/assistente/${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : JSON.stringify(body), signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message ?? (response.status === 404 ? "O Solar ainda não está disponível neste ambiente." : "Não foi possível consultar o Solar."));
    return data;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || submitting.current || busy || recording) return;
    submitting.current = true;
    const command = parseAutomationCommand(text);
    const flow = planSolarFlow(text, variant, context.allowedSections ?? []);
    const privateQuestion = Boolean(command || accountIntent(text) || solarTopic(text, variant));
    const history = messages.filter(message => !message.private).slice(-8).map(({ role, text }) => ({ role, text: text.slice(0, 1200) }));
    setMessages(current => [...current, { role: "user", text, private: privateQuestion }]); setQuestion(""); setBusy(true); setError("");
    controller.current = new AbortController();
    setDraft(null);
    try {
      if (command) {
        const prepared = await prepareAutomation(command, automationContext(), automationIO(controller.current.signal));
        if (active.current) setDraft(prepared);
        return;
      }
      if (/o que (voce|você|a solar) (pode|consegue)|suas funcoes|suas funções/i.test(text)) {
        setMessages(current => [...current, { role: "model", private: true, text: `Posso abrir os fluxos disponíveis neste acesso: ${(context.allowedSections ?? []).join(", ")}. Também consulto notificações e dados da UC/usina selecionada. Posso salvar nome, e-mail e telefone do perfil ou de clientes autorizados, nome da usina selecionada e apelido de UC própria, após revisão e confirmação aqui. As demais operações continuam no formulário correspondente.` }]);
        return;
      }
      if (flow) {
        const result = await onFlow(flow);
        if (active.current) setMessages(current => [...current, { role: "model", text: result, private: true }]);
        return;
      }
      if (solarTopic(text, variant) && /\b(abrir|abra|selecione|selecionar|trocar|troque|configurar|configure|editar|edite)\b/i.test(text)) throw new Error("Esse fluxo não está disponível no seu ambiente atual. Peça as funções disponíveis para conferir seu acesso.");
      const accountReply = await answerAccountQuestion(text, context, async path => {
        const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.current!.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message ?? "Não foi possível consultar os dados da sua conta.");
        return data;
      });
      if (accountReply) {
        if (active.current) setMessages(current => [...current, { role: "model", text: accountReply.text, private: true, section: accountReply.section }]);
        return;
      }
      const data = await request("responder", { question: text, variant: variant.toLowerCase(), history }, controller.current.signal);
      if (!data.answer || typeof data.answer !== "string") throw new Error("O Solar não retornou uma resposta. Tente novamente.");
      if (active.current) setMessages(current => [...current, { role: "model", text: data.answer, answerId: data.voiceAnswerId }]);
    } catch (reason) { if (active.current && !(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Não foi possível responder."); }
    finally { submitting.current = false; if (active.current) setBusy(false); }
  }
  async function speak(answerId: string) {
    if (voiceBusy || recording) return;
    setVoiceBusy(true); setError("");
    const generation = mediaGeneration.current;
    try {
      const data = await request("voz", { answerId });
      if (!active.current || document.hidden || generation !== mediaGeneration.current) return;
      if (typeof data.audio !== "string" || data.audio.length > 8_000_000 || data.mimeType !== "audio/wav") throw new Error("Resposta de áudio inválida.");
      stopMedia();
      const bytes = Uint8Array.from(atob(data.audio), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      const player = new Audio(url); audio.current = player;
      player.onended = () => { URL.revokeObjectURL(url); if (audio.current === player) audio.current = null; };
      await player.play();
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "Não foi possível reproduzir a voz."); }
    finally { if (active.current) setVoiceBusy(false); }
  }
  async function dictate() {
    setDraft(null);
    if (recording) { recorder.current?.stop(); return; }
    if (!consent || busy || voiceBusy || !microphoneSupported) return;
    setError(""); setVoiceBusy(true);
    const generation = mediaGeneration.current;
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current || document.hidden || generation !== mediaGeneration.current) { captured.getTracks().forEach(track => track.stop()); return; }
      stream.current = captured;
      const mimeType = ["audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Este navegador não oferece um formato de gravação compatível.");
      const recordingDevice = new MediaRecorder(captured, { mimeType }); recorder.current = recordingDevice;
      const chunks: Blob[] = []; let size = 0; acceptingAudio.current = true;
      recordingDevice.ondataavailable = event => { size += event.data.size; chunks.push(event.data); if (size > 1_900_000 && recordingDevice.state === "recording") recordingDevice.stop(); };
      recordingDevice.onstop = async () => {
        captured.getTracks().forEach(track => track.stop()); if (timer.current) clearTimeout(timer.current);
        if (!active.current) return;
        setRecording(false);
        if (!acceptingAudio.current || document.hidden) { setVoiceBusy(false); return; }
        acceptingAudio.current = false;
        try {
          if (size > 2_000_000) throw new Error("Gravação muito longa. Tente uma frase mais curta.");
          const form = new FormData(); form.append("audioConsent", "true"); form.append("audio", new Blob(chunks, { type: mimeType }), mimeType === "audio/webm" ? "fala.webm" : "fala.m4a");
          const data = await request("transcrever", form);
          if (active.current && generation === mediaGeneration.current && typeof data.text === "string") setQuestion(data.text.slice(0, 1200));
        } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "Não foi possível transcrever."); }
        finally { if (active.current) setVoiceBusy(false); }
      };
      recordingDevice.start(1000); setRecording(true);
      timer.current = setTimeout(() => { if (recordingDevice.state === "recording") recordingDevice.stop(); }, 25_000);
    } catch (reason) { stopMedia(); if (active.current) { setVoiceBusy(false); setError(reason instanceof Error ? reason.message : "Não foi possível acessar o microfone."); } }
  }
  function close() { if (busy) return; setDraft(null); setOpen(false); stopMedia(); setRecording(false); setVoiceBusy(false); }
  return <aside className="solar-web">
    <button className="solar-launch" type="button" aria-expanded={open} aria-controls="solar-web-panel" onClick={() => open ? close() : setOpen(true)}>☀ Solar</button>
    {open ? <section id="solar-web-panel" aria-label="Assistente Solar"><header><span><strong>Solar</strong><small>Assistente Andrade Energy</small></span><button type="button" aria-label="Fechar assistente" onClick={close}>×</button></header>
      <p className="solar-intro">Posso consultar, abrir fluxos e salvar alterações após sua confirmação. Experimente “altere o telefone do meu perfil para 31999999999” ou “renomeie UC 123 para Casa”.</p>
      <div className="solar-messages" role="log" aria-live="polite">{messages.map((item, index) => <article key={index} className={`solar-${item.role}`}><small>{item.role === "user" ? "Você" : "Solar"}{item.private && item.role === "model" ? " · consulta da conta" : ""}</small><p>{item.text}</p>{item.answerId ? <button disabled={voiceBusy || recording} type="button" onClick={() => void speak(item.answerId!)}>Ouvir resposta</button> : null}{item.section ? <button type="button" onClick={() => onNavigate(item.section!)}>Abrir {item.section}</button> : null}</article>)}{busy ? <p role="status">Solar está respondendo…</p> : null}</div>
      {error ? <p className="solar-error" role="alert">{error}</p> : null}
      {draft ? <div className="solar-confirmation" role="region" aria-label="Revisar alteração"><strong>Revisar alteração</strong><p>{draft.targetLabel}</p><dl><dt>Campo</dt><dd>{({ nome: "Nome", email: "E-mail", telefone: "Telefone", apelido: "Apelido" })[draft.command.field]}</dd><dt>Valor atual</dt><dd>{String(draft.before[draft.command.field] ?? "Não informado")}</dd><dt>Novo valor</dt><dd>{draft.command.value}</dd></dl><p>A confirmação vale por 5 minutos, neste ambiente.</p><button type="button" disabled={busy || recording} onClick={() => void confirmAutomation()}>Confirmar e salvar</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancelar alteração</button></div> : null}
      <form onSubmit={event => void submit(event)}><label htmlFor="solar-question">Sua mensagem</label><textarea id="solar-question" maxLength={1200} value={question} onChange={event => { setDraft(null); setQuestion(event.target.value); }} placeholder="Como posso ajudar?" disabled={busy || recording}/><div><button disabled={busy || recording || !question.trim()} type="submit">Enviar</button><button disabled={busy || voiceBusy || recording} type="button" onClick={() => { stopMedia(); setDraft(null); setMessages([]); setError(""); }}>Limpar conversa</button></div></form>
      {microphoneSupported ? <div className="solar-dictation"><label><input type="checkbox" checked={consent} disabled={recording || voiceBusy} onChange={event => setConsent(event.target.checked)}/>Autorizo enviar minha gravação para transcrição.</label><button type="button" disabled={!consent || busy || (voiceBusy && !recording)} onClick={() => void dictate()}>{recording ? "Parar e transcrever" : voiceBusy ? "Processando…" : "Ditar mensagem"}</button><small>{recording ? "Microfone ativo · limite de 25 segundos" : "Revise o texto antes de enviar."}</small></div> : null}
    </section> : null}
  </aside>;
}
