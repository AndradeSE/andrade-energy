import { apiFetch as fetch } from "./apiClient";
import { changedFields } from "./flowSafety";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type RecordData = Record<string, unknown>;
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea"; options?: Array<[string,string]> };

const API_URL = "/api";
const EMPTY_FIELDS: Field[] = [];
const schemas: Record<string, Field[]> = {
  Clientes: [
    { key:"nome",label:"Nome" },{ key:"telefone",label:"Telefone / WhatsApp" },{ key:"email",label:"E-mail" },
    { key:"cpf",label:"CPF / CNPJ" },{ key:"endereco",label:"Endereço" },
  ],
  Usinas: [
    { key:"nome",label:"Nome da usina" },{ key:"numero_instalacao",label:"Número da instalação / UC" },{ key:"potencia_kwp",label:"Potência (kWp)",type:"number" },
    { key:"geracao_media",label:"Geração média (kWh/mês)",type:"number" },{ key:"investimento",label:"Investimento (R$)",type:"number" },
    { key:"titular_nome",label:"Titular" },{ key:"endereco",label:"Endereço" },
  ],

};

export default function RecordEditForm({ section, record, token, onSaved }: { section: string; record: RecordData; token: string; onSaved: (data: RecordData) => void }) {
  const fields = ["Clientes", "Usinas"].includes(section) ? schemas[section] : EMPTY_FIELDS;
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, String(record[field.key] ?? "")])), [fields, record]);
  const [form, setForm] = useState<Record<string,string>>(initial); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false);
  const inFlight = useRef(false);
  useEffect(() => { setForm(initial); setMessage(""); }, [initial]);
  if (!fields.length || !record.id) return null;
  const endpoints: Record<string,string> = { Clientes:`/clientes/${record.id}`,Usinas:`/usinas/${record.id}` };
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setMessage("");
    try {
      const payload = changedFields(form, initial, new Set(fields.filter(f => f.type === "number").map(f => f.key)));
      if (!Object.keys(payload).length) { setMessage("Nenhuma alteração para salvar."); return; }
      const response = await fetch(`${API_URL}${endpoints[section]}`, {method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível salvar.");
      setMessage("Alterações salvas."); onSaved({...record,...payload,...data});
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
    finally { inFlight.current = false; setSaving(false); }
  }

  return <details className="record-editor"><summary>Editar dados completos <span>⌄</span></summary><form onSubmit={submit}><fieldset disabled={saving} style={{border:0,padding:0,margin:0}}><div className="record-editor-grid">{fields.map((field)=><label key={field.key}>{field.label}{field.type==="select"?<select value={form[field.key]} onChange={(e)=>setForm({...form,[field.key]:e.target.value})}>{field.options?.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>:field.type==="textarea"?<textarea value={form[field.key]} onChange={(e)=>setForm({...form,[field.key]:e.target.value})}/>:<input type={field.type??"text"} step={field.type==="number"?"0.01":undefined} value={form[field.key]} onChange={(e)=>setForm({...form,[field.key]:e.target.value})}/>}</label>)}</div></fieldset><button disabled={saving}>{saving?"Salvando...":"Salvar alterações"}</button>{message&&<small>{message}</small>}</form></details>;
}
