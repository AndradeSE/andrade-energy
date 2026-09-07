import { PointerEvent, useEffect, useRef, useState } from "react";

type Props = {
  apiUrl: string;
  token: string;
  contract: Record<string, unknown>;
  onSigned: (contract: Record<string, unknown>) => void;
};

type Point = { x: number; y: number };

export default function ConsumerContractSignatureWeb({ apiUrl, token, contract, onSigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const currentStroke = useRef<Point[]>([]);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const signed = Boolean(contract.aceite_cliente_em || contract.contrato_assinado_url);
  const documentUrl = String(contract.contrato_assinado_url ?? contract.contrato_gerado_url ?? contract.arquivo_pdf ?? "");

  function redraw(nextStrokes = strokes) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#123d31";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    nextStrokes.forEach((stroke) => {
      if (!stroke.length) return;
      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    });
  }

  useEffect(() => redraw(), [strokes]);

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * canvas.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * canvas.height),
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    currentStroke.current = [pointFromEvent(event)];
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    currentStroke.current.push(pointFromEvent(event));
    redraw([...strokes, currentStroke.current]);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStroke.current.length > 1) setStrokes((current) => [...current, currentStroke.current]);
    currentStroke.current = [];
  }

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/contratos/${contract.id}/codigo-assinatura`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível enviar o código.");
      setMaskedEmail(String(data.emailMascarado ?? "seu e-mail"));
      setMessage("Código enviado. Ele é válido por 10 minutos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o código.");
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (code.length !== 6) return setMessage("Informe os seis dígitos enviados ao seu e-mail.");
    if (!strokes.length || JSON.stringify(strokes).length < 80) return setMessage("Faça sua assinatura no campo indicado.");
    setBusy(true);
    setMessage("");
    try {
      const signature = strokes.map((stroke) => stroke.map((point) => `${point.x},${point.y}`).join("|"));
      const response = await fetch(`${apiUrl}/contratos/${contract.id}/aceite-eletronico`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: code, assinatura: signature }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível assinar o contrato.");
      setMessage("Contrato assinado. Abrindo sua lista de unidades...");
      onSigned(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível assinar o contrato.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="consumer-contract-signature">
      <div>
        <span className="section-label">CONTRATO DA UNIDADE</span>
        <h3>{signed ? "Assinatura registrada" : "Revise e assine para liberar esta UC"}</h3>
        <p>O aceite fica vinculado exatamente ao PDF revisado, ao código enviado por e-mail e às evidências técnicas da assinatura.</p>
      </div>
      {documentUrl ? <a className="tool-button" href={documentUrl} target="_blank" rel="noreferrer">Abrir contrato completo em PDF</a> : <strong>O gerador ainda não disponibilizou o PDF para assinatura.</strong>}
      {!signed && documentUrl ? (
        <>
          <label className="signature-label" htmlFor="contract-signature">Assine no campo abaixo</label>
          <canvas
            id="contract-signature"
            ref={canvasRef}
            width={760}
            height={220}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
          />
          <div className="signature-actions">
            <button type="button" disabled={busy || !strokes.length} onClick={() => setStrokes([])}>Limpar assinatura</button>
            <button type="button" disabled={busy} onClick={() => void requestCode()}>Enviar código por e-mail</button>
          </div>
          {maskedEmail ? <small>Código enviado para {maskedEmail}</small> : null}
          <label className="signature-code">Código de confirmação<input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
          <button className="primary-sign-button" type="button" disabled={busy || code.length !== 6 || !strokes.length} onClick={() => void sign()}>{busy ? "Processando..." : "Confirmar e assinar contrato"}</button>
        </>
      ) : null}
      {message ? <div className="invite-message">{message}</div> : null}
    </section>
  );
}
