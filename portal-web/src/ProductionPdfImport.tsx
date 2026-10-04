import { FormEvent, useState } from "react";

export default function ProductionPdfImport({ apiUrl, token, onClose, onSuccess }: {
  apiUrl: string; token: string; onClose: () => void; onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file || busy || done) return;
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.append("arquivo", file);
      if (password) body.append("senhaPdf", password);
      const response = await fetch(`${apiUrl}/usinas/importar-producao-pdf`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === "PDF_PASSWORD_REQUIRED") setNeedsPassword(true);
        throw new Error(data.message ?? "Não foi possível importar o PDF.");
      }
      setDone(true); setPassword(""); onSuccess();
      setMessage(`Produção registrada em ${data.usina?.nome ?? "sua usina"}, competência ${data.dados?.referencia ?? "identificada no PDF"}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível importar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="modal-card"><button className="modal-close" disabled={busy} onClick={onClose} aria-label="Fechar">×</button><h2>Importar dados de produção</h2><p>A UC do PDF identifica a usina na sua operação. Esta importação registra produção; não emite cobrança para um cliente.</p><form className="commercial-form" onSubmit={submit}><fieldset disabled={busy || done}><label>Fatura da usina <span style={{color:"#b42318"}}>*</span><input required accept="application/pdf" type="file" onChange={e => {setFile(e.target.files?.[0] ?? null); setNeedsPassword(false); setPassword("");}}/></label>{needsPassword && <label>Senha do PDF<input required type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label>}</fieldset>{!done && <button disabled={busy || !file}>{busy ? "Lendo conta…" : "Importar dados de produção"}</button>}{message && <p role="status">{message}</p>}{done && <button type="button" onClick={onClose}>Concluir</button>}</form></section></div>;
}
