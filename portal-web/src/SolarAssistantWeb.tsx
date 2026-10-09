import { apiFetch as fetch } from "./apiClient";
import { FormEvent, useEffect, useRef, useState } from "react";
import "./web-improvements.css";
import { accountIntent, answerAccountQuestion, type WebAssistantContext } from "./assistantAccountWeb";
type Message = { role: "user" | "model"; text: string; answerId?: string; private?: boolean; section?: string };
export default function SolarAssistantWeb({ apiUrl, token, variant, context, onNavigate }: { apiUrl: string; token: string; variant: "CONSUMIDOR" | "GERADOR"; context: WebAssistantContext; onNavigate: (section: string) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const active = useRef(true);
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
  async function request(path: string, body: unknown, signal?: AbortSignal) {
    const response = await fetch(`${apiUrl}/assistente/${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : JSON.stringify(body), signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message ?? (response.status === 404 ? "O Solar ainda não está disponível neste ambiente." : "Não foi possível consultar o Solar."));
    return data;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy || recording) return;
    const privateQuestion = Boolean(accountIntent(text));
    const history = messages.filter(message => !message.private).slice(-8).map(({ role, text }) => ({ role, text: text.slice(0, 1200) }));
    setMessages(current => [...current, { role: "user", text, private: privateQuestion }]); setQuestion(""); setBusy(true); setError("");
    controller.current = new AbortController();
    try {
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
    finally { if (active.current) setBusy(false); }
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
  function close() { setOpen(false); stopMedia(); setRecording(false); setVoiceBusy(false); }
  return <aside className="solar-web">
    <button className="solar-launch" type="button" aria-expanded={open} aria-controls="solar-web-panel" onClick={() => open ? close() : setOpen(true)}>☀ Solar</button>
    {open ? <section id="solar-web-panel" aria-label="Assistente Solar"><header><span><strong>Solar</strong><small>Assistente Andrade Energy</small></span><button type="button" aria-label="Fechar assistente" onClick={close}>×</button></header>
      <p className="solar-intro">Posso explicar os recursos e consultar os dados do seu acesso na UC ou usina selecionada. Não realizo cobranças nem assino contratos.</p>
      <div className="solar-messages" role="log" aria-live="polite">{messages.map((item, index) => <article key={index} className={`solar-${item.role}`}><small>{item.role === "user" ? "Você" : "Solar"}{item.private && item.role === "model" ? " · consulta da conta" : ""}</small><p>{item.text}</p>{item.answerId ? <button disabled={voiceBusy || recording} type="button" onClick={() => void speak(item.answerId!)}>Ouvir resposta</button> : null}{item.section ? <button type="button" onClick={() => onNavigate(item.section!)}>Abrir {item.section}</button> : null}</article>)}{busy ? <p role="status">Solar está respondendo…</p> : null}</div>
      {error ? <p className="solar-error" role="alert">{error}</p> : null}
      <form onSubmit={event => void submit(event)}><label htmlFor="solar-question">Sua mensagem</label><textarea id="solar-question" maxLength={1200} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Como posso ajudar?" disabled={busy || recording}/><div><button disabled={busy || recording || !question.trim()} type="submit">Enviar</button><button disabled={busy || voiceBusy || recording} type="button" onClick={() => { stopMedia(); setMessages([]); setError(""); }}>Limpar conversa</button></div></form>
      {microphoneSupported ? <div className="solar-dictation"><label><input type="checkbox" checked={consent} disabled={recording || voiceBusy} onChange={event => setConsent(event.target.checked)}/>Autorizo enviar minha gravação para transcrição.</label><button type="button" disabled={!consent || busy || (voiceBusy && !recording)} onClick={() => void dictate()}>{recording ? "Parar e transcrever" : voiceBusy ? "Processando…" : "Ditar mensagem"}</button><small>{recording ? "Microfone ativo · limite de 25 segundos" : "Revise o texto antes de enviar."}</small></div> : null}
    </section> : null}
  </aside>;
}
