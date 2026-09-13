import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Props = { token: string; apiUrl: string; commercial: boolean };
type PermissionMap = Record<string, boolean>;

const GENERATOR = { usinas: "Usinas", clientes: "Clientes", unidades: "Unidades consumidoras", contratos: "Contratos", faturas: "Faturas", operacao: "Operação" };
const COMMERCIAL = { geradores: "Geradores", monitoramento: "Monitoramento", documentos: "Documentos operacionais" };

export default function CollaboratorsPanel({ token, apiUrl, commercial }: Props) {
  const fields = commercial ? COMMERCIAL : GENERATOR;
  const role = commercial ? "COLABORADOR_COMERCIAL" : "COLABORADOR_GERADOR";
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", telefone: "" });
  const [permissions, setPermissions] = useState<PermissionMap>(() => Object.fromEntries(Object.keys(fields).map((key) => [key, true])));
  const [data, setData] = useState<any>({ colaboradores: [], convites: [] });
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? "Não foi possível concluir a operação.");
    return payload;
  }, [apiUrl, token]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [team, history] = await Promise.all([request("/colaboradores"), request("/colaboradores/auditoria")]);
      setData(team); setAudit(Array.isArray(history) ? history : []); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar a equipe."); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => setPermissions(Object.fromEntries(Object.keys(fields).map((key) => [key, true]))), [commercial]);

  const list = useMemo(() => [
    ...(data.colaboradores ?? []).map((item: any) => ({ ...item, pending: false })),
    ...(data.convites ?? []).map((item: any) => ({ ...item, pending: true })),
  ], [data]);

  async function invite(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const result = await request("/colaboradores/convites", { method: "POST", body: JSON.stringify({ ...form, papel: role, permissoes: permissions }) });
      setForm({ nome: "", cpf: "", email: "", telefone: "" });
      setMessage(result.emailEnviado ? "Convite enviado por e-mail." : `Convite criado. Código para compartilhar: ${result.token ?? ""}`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível convidar."); }
    finally { setSaving(false); }
  }
  async function act(path: string, options: RequestInit, success: string) {
    try { const result = await request(path, options); setMessage(result.token ? `${success} Código: ${result.token}` : success); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir."); }
  }
  const actor = (item: any) => Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
  return <div className="collaborators-page">
    <section className="subscription-hero"><div><small>{commercial ? "EQUIPE COMERCIAL" : "EQUIPE DO GERADOR"}</small><h2>Colaboradores</h2><p>Convide pessoas com login próprio e defina exatamente quais áreas operacionais podem acessar.</p></div><span>ACESSO CONTROLADO</span></section>
    <div className="collaborators-layout">
      <section className="section-workspace"><span className="section-label">NOVO CONVITE</span><h2>Convidar colaborador</h2><p>Carteira, recebíveis, transferências, planos e ferramentas do titular permanecem bloqueados.</p>
        <form className="commercial-form" onSubmit={invite}>
          <div className="commercial-form-row"><label>Nome completo<input required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })}/></label><label>CPF<input required inputMode="numeric" maxLength={14} value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })}/></label></div>
          <div className="commercial-form-row"><label>E-mail<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>Telefone<input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })}/></label></div>
          <fieldset className="permission-fieldset"><legend>Permissões operacionais</legend>{Object.entries(fields).map(([key, label]) => <label className="permission-switch" key={key}><span>{label}</span><input checked={permissions[key] !== false} type="checkbox" onChange={(event) => setPermissions({ ...permissions, [key]: event.target.checked })}/></label>)}</fieldset>
          <button className="primary-action" disabled={saving}>{saving ? "Enviando..." : "Enviar convite"}</button>
        </form>{message ? <div className="invite-message">{message}</div> : null}
      </section>
      <section className="section-workspace"><span className="section-label">EQUIPE E CONVITES</span><h2>{list.length} acesso(s)</h2>{loading ? <div className="data-state">Carregando equipe...</div> : list.length ? <div className="team-list">{list.map((item: any) => { const user = actor(item); const active = item.pending ? item.status === "PENDENTE" : item.ativo; const itemPermissions = item.papel === "COLABORADOR_COMERCIAL" ? COMMERCIAL : GENERATOR; return <article key={`${item.pending}-${item.id}`}><header><b>{String(item.nome ?? user?.nome ?? "C").charAt(0)}</b><span><strong>{item.nome ?? user?.nome ?? "Colaborador"}</strong><small>{item.email ?? user?.email ?? ""}</small></span><em className={active ? "active" : ""}>{item.pending ? item.status : active ? "ATIVO" : "BLOQUEADO"}</em></header>{!item.pending ? <div>{Object.entries(itemPermissions).map(([key, label]) => <label className="permission-switch" key={key}><span>{label}</span><input disabled={!active} checked={item.permissoes?.[key] !== false} type="checkbox" onChange={(event) => void act(`/colaboradores/${item.id}`, { method: "PATCH", body: JSON.stringify({ permissoes: { ...item.permissoes, [key]: event.target.checked } }) }, "Permissões atualizadas.")}/></label>)}</div> : null}<footer>{item.pending ? <><button onClick={() => void act(`/colaboradores/convites/${item.id}/reenviar`, { method: "POST" }, "Convite reenviado.")}>Reenviar</button><button className="danger" onClick={() => void act(`/colaboradores/convites/${item.id}`, { method: "DELETE" }, "Convite cancelado.")}>Cancelar</button></> : <button className={active ? "danger" : ""} onClick={() => void act(`/colaboradores/${item.id}`, { method: "PATCH", body: JSON.stringify({ ativo: !active }) }, active ? "Acesso bloqueado." : "Acesso reativado.")}>{active ? "Bloquear acesso" : "Reativar acesso"}</button>}</footer></article>; })}</div> : <div className="data-state">Nenhum colaborador ou convite cadastrado.</div>}</section>
    </div>
    <section className="section-workspace collaborator-audit"><span className="section-label">AUDITORIA INDIVIDUAL</span><h2>Atividades dos colaboradores</h2><p>Cada operação fica associada ao login utilizado, com data, área e resultado.</p>{audit.length ? <div className="audit-list">{audit.map((item: any) => { const user = actor(item); const method = String(item.acao ?? "").replace("COLABORADOR_", ""); return <article key={item.id}><span><strong>{user?.nome ?? "Colaborador removido"}</strong><small>{method} em {item.recurso}</small></span><span><strong>{Number(item.detalhes?.status) < 400 ? "Concluída" : "Falhou"}</strong><small>{new Date(item.criado_em).toLocaleString("pt-BR")}</small></span></article>; })}</div> : <div className="data-state">Nenhuma atividade registrada ainda.</div>}</section>
  </div>;
}
