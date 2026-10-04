import { FormEvent, useMemo, useState } from "react";
import AddressFields from "./AddressFields";
import { cpfValido, erroEndereco, lerEnderecoFatura, nomeCompletoValido } from "../../utils/cadastroCliente";

type RecordData = Record<string, unknown>;
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea"; options?: Array<[string,string]> };

const API_URL = import.meta.env.VITE_API_URL ?? "https://andrade-energy-api-vda.onrender.com/api";
const schemas: Record<string, Field[]> = {
  Clientes: [
    { key:"nome",label:"Nome" },{ key:"telefone",label:"Telefone / WhatsApp" },{ key:"email",label:"E-mail" },
    { key:"cpf",label:"CPF / CNPJ" },{ key:"endereco",label:"Endereço" },
  ],
  Usinas: [
    { key:"nome",label:"Nome da usina" },{ key:"numero_instalacao",label:"Número da instalação / UC" },{ key:"potencia_kwp",label:"Potência (kWp)",type:"number" },
    { key:"geracao_media",label:"Geração média (kWh/mês)",type:"number" },{ key:"investimento",label:"Investimento (R$)",type:"number" },
    { key:"titular_nome",label:"Titular" },{ key:"cpf_titular",label:"CPF/CNPJ do titular da conta" },{ key:"endereco",label:"Endereço" },
  ],
  Operação: [
    { key:"competencia",label:"Competência",type:"date" },{ key:"energia_gerada",label:"Energia gerada (kWh)",type:"number" },{ key:"energia_alocada",label:"Energia alocada (kWh)",type:"number" },
    { key:"receita_prevista",label:"Receita prevista (R$)",type:"number" },{ key:"receita_realizada",label:"Receita realizada (R$)",type:"number" },
  ],
  Contratos: [
    { key:"locador_nome",label:"Nome ou razão social do locador" },{ key:"locador_documento",label:"CPF/CNPJ do locador" },{ key:"locador_endereco",label:"Endereço do locador" },
    { key:"prazo_anos",label:"Prazo do contrato (anos)",type:"number" },{ key:"foro",label:"Foro" },{ key:"locatario_nome",label:"Nome do titular / locatário" },
    { key:"locatario_documento",label:"CPF/CNPJ do titular" },{ key:"endereco_uc",label:"Endereço da unidade consumidora",type:"textarea" },{ key:"numero",label:"Número do contrato" },
    { key:"termo_adesao",label:"Termo de adesão" },{ key:"status",label:"Status",type:"select",options:[["ATIVO","Ativo"],["VIGENTE","Vigente"],["VENCIDO","Vencido"]] },
    { key:"desconto_percentual",label:"Desconto contratado (%)",type:"number" },{ key:"inicio_vigencia",label:"Início da vigência",type:"date" },{ key:"fim_vigencia",label:"Vencimento do contrato",type:"date" },
    { key:"economia_mensal",label:"Economia mensal estimada (R$)",type:"number" },{ key:"economia_anual",label:"Economia anual estimada (R$)",type:"number" },{ key:"observacoes",label:"Observações",type:"textarea" },
  ],
};

export default function RecordEditForm({ section, record, token, onSaved }: { section: string; record: RecordData; token: string; onSaved: (data: RecordData) => void }) {
  const fields = schemas[section] ?? [];
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, String(record[field.key] ?? "")])), [fields, record]);
  const [form, setForm] = useState<Record<string,string>>(initial); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false);
  if (!fields.length || !record.id) return null;
  const endpoints: Record<string,string> = { Clientes:`/clientes/${record.id}`,Usinas:`/usinas/${record.id}`,Operação:`/fechamentos/${record.id}`,Contratos:`/contratos/unidade/${record.id}` };
  const addressKeys = new Set(["endereco", "locador_endereco", "endereco_uc"]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    if (section === "Clientes" && !nomeCompletoValido(form.nome)) return setMessage("Informe nome e sobrenome válidos.");
    if (section === "Clientes" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setMessage("Informe um e-mail válido.");
    if (section === "Clientes" && !cpfValido(form.cpf)) return setMessage("Informe um CPF válido.");
    for (const field of fields.filter(f => addressKeys.has(f.key))) {
      const error = erroEndereco(lerEnderecoFatura(form[field.key]));
      if (error) return setMessage(`${field.label}: ${error}`);
    }
    setSaving(true); setMessage("");
    try {
      const numeric = new Set(fields.filter(f => f.type === "number").map(f => f.key));
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, numeric.has(key) ? Number(value || 0) : value.trim() || null]));
      const response = await fetch(`${API_URL}${endpoints[section]}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível salvar.");
      setMessage("Alterações salvas."); onSaved({ ...record, ...payload, ...data });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { setSaving(false); }
  }
  return <details className="record-editor"><summary>Editar dados completos <span>⌄</span></summary><form onSubmit={submit}><fieldset disabled={saving}><div className="record-editor-grid">{fields.map(field => {
    if (addressKeys.has(field.key)) return <AddressFields key={field.key} title={field.label} value={form[field.key]} onChange={value => setForm(current => ({ ...current, [field.key]: value }))}/>;
    if (section === "Clientes" && field.key === "nome") {
      const parts = form.nome.split(" ");
      return <div key={field.key} className="record-editor-grid"><label>Nome <span style={{color:"#b42318"}}>*</span><input required autoComplete="given-name" value={parts[0] ?? ""} onChange={e => setForm(current => ({ ...current, nome: `${e.target.value.replace(/\s/g, "")} ${parts.slice(1).join(" ")}` }))}/></label><label>Sobrenome <span style={{color:"#b42318"}}>*</span><input required autoComplete="family-name" value={parts.slice(1).join(" ")} onChange={e => setForm(current => ({ ...current, nome: `${parts[0]} ${e.target.value}` }))}/></label></div>;
    }
    const required = section === "Clientes" && ["email", "cpf"].includes(field.key);
    return <label key={field.key}>{field.label}{required && <span style={{color:"#b42318"}}> *</span>}{field.type === "select" ? <select value={form[field.key]} onChange={e => setForm({...form,[field.key]:e.target.value})}>{field.options?.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select> : field.type === "textarea" ? <textarea value={form[field.key]} onChange={e=>setForm({...form,[field.key]:e.target.value})}/> : <input required={required} type={field.key === "email" ? "email" : field.type ?? "text"} step={field.type === "number" ? "0.01" : undefined} value={form[field.key]} onChange={e=>setForm({...form,[field.key]:e.target.value})}/>}</label>;
  })}</div></fieldset><button disabled={saving}>{saving?"Salvando...":"Salvar alterações"}</button>{message&&<small role="status">{message}</small>}</form></details>;
}
