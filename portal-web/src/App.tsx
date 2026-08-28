import { CSSProperties, FormEvent, useCallback, useEffect, useState } from "react";
import bulbImage from "./assets/lampada-dourada.png";
import RecordEditForm from "./RecordEditForm";
import RealDiscountInfoWeb from "./RealDiscountInfoWeb";
import "./mobile.css";
import "./download.css";

const APP_GERADOR_URL = String(import.meta.env.VITE_APP_GERADOR_DOWNLOAD_URL ?? "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk").trim();
const APP_CONSUMIDOR_URL = String(import.meta.env.VITE_APP_CONSUMIDOR_DOWNLOAD_URL ?? "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-consumidor.apk").trim();
const TESTE_GRATUITO_HABILITADO = false;

type AccessType = "CONSUMIDOR" | "GERADOR";
type AdminWorkspace = "COMERCIAL" | "USINAS";
type PortalSession = {
  token?: string;
  usuario?: {
    id?: string;
    nome?: string;
    email?: string;
    perfil?: string;
    cliente_id?: string;
    usina_id?: string;
  };
  accessType?: AccessType;
  adminWorkspace?: AdminWorkspace;
  [key: string]: unknown;
};
type WebRecord = Record<string, unknown>;
type PortalCompany = { nome: string; logo_url?: string | null; email_suporte?: string | null; cor_primaria: string; cor_secundaria: string; identidade_personalizada: boolean };
const DEFAULT_COMPANY: PortalCompany = { nome: "Andrade Energy", email_suporte: "contato@andradese.com.br", cor_primaria: "#087A46", cor_secundaria: "#F7D75C", identidade_personalizada: true };

function AppDownloadLink({
  href,
  app,
  description,
  detailed = false,
}: {
  href: string;
  app: "Gerador" | "Consumidor";
  description: string;
  detailed?: boolean;
}) {
  const fileName = app === "Gerador"
    ? "andrade-energy-gerador.apk"
    : "andrade-energy-consumidor.apk";

  return <a
    href={href || undefined}
    className={!href ? "disabled" : undefined}
    aria-disabled={!href}
    aria-label={`Baixar aplicativo Andrade Energy ${app} para Android`}
    download={fileName}
    rel="external"
  >
    <b aria-hidden="true">{app === "Gerador" ? "G" : "C"}</b>
    <span>
      <strong>{`Baixar app do ${app}`}</strong>
      <small>{description}</small>
    </span>
    {detailed ? <em aria-hidden="true">Baixar APK ↓</em> : null}
  </a>;
}

function AdminWorkspaceChoice({ name, onChoose, onLogout }: { name?: string; onChoose: (workspace: AdminWorkspace) => void; onLogout: () => void }) {
  return <main className="admin-workspace-page">
    <section className="admin-workspace-hero"><span className="brand-logo-wrap"><AnimatedLogo /><img className="brand-lightbulb" src={bulbImage} alt="" aria-hidden="true" /></span><small>ACESSO ADMINISTRATIVO</small><h1>Olá, {name ?? "Administrador"}</h1><p>Escolha o ambiente que deseja acessar. A administração comercial fica separada da operação das usinas.</p></section>
    <section className="admin-workspace-options">
      <button onClick={() => onChoose("COMERCIAL")}><i className="commercial">$</i><span><strong>Gestão Comercial</strong><small>Planos, assinaturas, mensalidades, contratos, termos e contas geradoras.</small><em>Acessar ambiente →</em></span></button>
      <button onClick={() => onChoose("USINAS")}><i className="plants">☀</i><span><strong>Gestão de Usinas</strong><small>Usinas, clientes, unidades, geração, faturas, carteira e operação.</small><em>Acessar ambiente →</em></span></button>
      <button className="admin-workspace-logout" onClick={onLogout}>Sair da conta</button>
    </section>
  </main>;
}

const API_URL =
  import.meta.env.VITE_API_URL ??
  "https://andrade-energy-api-vda.onrender.com/api";

const STATUS_PT: Record<string, string> = {
  DONE: "Concluída",
  PENDING: "Pendente",
  AUTHORIZING: "Em autorização",
  REFUSED: "Recusada",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
  RECEIVED: "Recebida",
  CONFIRMED: "Confirmada",
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
};
function formatPortalValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (/status|situacao/i.test(field))
    return STATUS_PT[text.toUpperCase()] ?? text;
  if (/competencia|referencia/i.test(field) && /^\d{4}-\d{2}$/.test(text))
    return `${text.slice(5, 7)}/${text.slice(0, 4)}`;
  if (
    (/data|vencimento|criado|atualizado|pagamento|competencia|referencia/i.test(field) ||
      /^\d{4}-\d{2}-\d{2}T/.test(text)) &&
    /^\d{4}-\d{2}-\d{2}/.test(text)
  )
    return new Date(`${text.slice(0, 10)}T12:00:00`).toLocaleDateString(
      "pt-BR",
    );
  if (
    /valor|receita|economia|saldo/i.test(field) &&
    Number.isFinite(Number(value))
  )
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  return text;
}

function Icon({
  name,
}: {
  name: "user" | "sun" | "arrow" | "mail" | "lock" | "eye" | "check";
}) {
  const paths = {
    user: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function AnimatedLogo() {
  return (
    <svg
      className="animated-brand-logo"
      viewBox="0 0 790 220"
      role="img"
      aria-label="Andrade Energy"
    >
      <defs>
        <linearGradient id="leafGreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5cf2a7" />
          <stop offset="0.48" stopColor="#20cf7a" />
          <stop offset="1" stopColor="#079454" />
        </linearGradient>
      </defs>
      <g className="logo-sun">
        <path d="M26 179 C35 72 96 31 153 34 C202 36 229 72 235 127" />
      </g>
      <path
        className="logo-a"
        d="M45 190 L142 18 L237 190 L194 190 L142 94 L89 190 Z"
      />
      <g className="logo-wordmark">
        <text x="255" y="132">
          NDRADE
        </text>
        <line
          className="logo-energy-line-left"
          x1="258"
          y1="180"
          x2="318"
          y2="180"
        />
        <text className="logo-energy" x="338" y="191">
          ENERGY
        </text>
        <path
          className="logo-energy-line-right logo-energy-cable"
          d="M580 180 H645 C660 180 662 172 651 169 C639 166 638 160 650 157 L650 153"
        />
      </g>
      <g className="logo-leaf-element">
        <path
          className="logo-leaf-shape"
          d="M25 184 C74 176 102 147 141 134 C183 120 226 128 276 151 C224 144 190 150 151 172 C109 196 65 204 25 184 Z"
        />
        <path
          className="logo-leaf-vein"
          d="M42 184 C93 179 139 160 194 145 C219 138 242 142 263 149"
        />
        <path
          className="logo-leaf-vein soft"
          d="M108 174 C113 161 121 151 134 139 M157 158 C164 145 174 137 187 132"
        />
      </g>
    </svg>
  );
}

function readSession(): PortalSession | null {
  try {
    const stored = sessionStorage.getItem("andrade_energy_portal_session");
    return stored ? (JSON.parse(stored) as PortalSession) : null;
  } catch {
    sessionStorage.removeItem("andrade_energy_portal_session");
    return null;
  }
}

function ClientOverview({
  data,
  onNavigate,
}: {
  data: WebRecord | null;
  onNavigate: (section: string) => void;
}) {
  const consumption = Number(data?.consumo ?? 0);
  const credits = Number(data?.creditos ?? 0);
  const savings = Number(data?.economiaMes ?? 0);
  const compensation =
    consumption > 0
      ? Math.min(100, Math.round((credits / consumption) * 100))
      : 0;
  const invoice = (
    data?.ultimaFatura && typeof data.ultimaFatura === "object"
      ? data.ultimaFatura
      : {}
  ) as WebRecord;
  return (
    <>
      <div className="client-hero">
        <div>
          <small>ECONOMIA NESTE MÊS</small>
          <strong>
            {savings.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <span>Sua energia gerando valor todos os dias</span>
        </div>
        <div className="client-orbit">
          <b>{compensation}%</b>
          <small>compensado</small>
        </div>
      </div>
      <div className="dashboard-metrics top-metrics client-metrics">
        <article>
          <small>Consumo</small>
          <strong>{consumption.toLocaleString("pt-BR")} kWh</strong>
          <span>Competência atual</span>
        </article>
        <article>
          <small>Créditos recebidos</small>
          <strong>{credits.toLocaleString("pt-BR")} kWh</strong>
          <span className="metric-up">Energia compensada</span>
        </article>
        <article>
          <small>Minha unidade</small>
          <strong>{String(data?.uc ?? "—")}</strong>
          <span>
            {String(data?.distribuidora ?? "Distribuidora não informada")}
          </span>
        </article>
        <article>
          <small>Última fatura</small>
          <strong>
            {Number(invoice.valor ?? 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <span>{formatPortalValue("competencia", invoice.competencia ?? "Sem competência")}</span>
        </article>
      </div>
      <div className="client-columns">
        <article className="consumption-card">
          <div className="card-heading">
            <div>
              <small>CONSUMO E CRÉDITOS</small>
              <h2>Balanço da sua energia</h2>
            </div>
          </div>
          <div className="energy-balance">
            <div>
              <span style={{ width: "100%" }} />
              <small>Consumo</small>
              <strong>{consumption.toLocaleString("pt-BR")} kWh</strong>
            </div>
            <div>
              <span className="credit" style={{ width: `${compensation}%` }} />
              <small>Créditos</small>
              <strong>{credits.toLocaleString("pt-BR")} kWh</strong>
            </div>
          </div>
          <p>
            {compensation}% do consumo desta competência foi compensado por
            energia limpa.
          </p>
        </article>
        <article className="invoice-card">
          <small>PRÓXIMO VENCIMENTO</small>
          <h2>{formatPortalValue("vencimento", invoice.vencimento ?? "Não informado")}</h2>
          <p>Referência {formatPortalValue("competencia", invoice.competencia ?? "—")}</p>
          <button onClick={() => onNavigate("Faturas")}>
            Ver minhas faturas →
          </button>
        </article>
      </div>
      <div className="smart-row">
        <div>
          <span className="smart-icon">☀</span>
          <div>
            <small>RESULTADO SUSTENTÁVEL</small>
            <strong>
              Você economizou{" "}
              {savings.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}{" "}
              nesta competência usando energia renovável.
            </strong>
          </div>
        </div>
        <button onClick={() => onNavigate("Economia")}>Ver histórico →</button>
      </div>
    </>
  );
}

function GeneratorInvitePanel({ token }: { token: string }) {
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", perfil: "GESTOR" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [accounts, setAccounts] = useState<WebRecord[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch(`${API_URL}/usuarios/geradores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setAccounts(Array.isArray(data) ? data : []);
    } finally {
      setLoadingAccounts(false);
    }
  };
  useEffect(() => {
    void loadAccounts();
  }, [token]);
  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/convites/geradores`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message ?? "Não foi possível criar o convite.");
      setMessage(
        data.emailEnviado
          ? "Convite enviado por e-mail com sucesso."
          : `Convite criado. Código: ${data.token}`,
      );
      setForm({ nome: "", cpf: "", email: "", perfil: "GESTOR" });
      await loadAccounts();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o convite.",
      );
    } finally {
      setSending(false);
    }
  }
  async function toggleAccount(account: WebRecord) {
    const response = await fetch(
      `${API_URL}/usuarios/geradores/${account.id}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: !account.ativo }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? `Conta ${account.ativo ? "desativada" : "ativada"} com sucesso.`
        : (data.message ?? "Não foi possível alterar a conta."),
    );
    if (response.ok) await loadAccounts();
  }
  return (
    <div className="admin-generator-stack">
      <div className="section-workspace invite-workspace">
        <div>
          <span className="section-label">ACESSO ADMINISTRATIVO</span>
          <h2>Criar acesso administrativo ou gerador</h2>
          <p>
            Somente uma conta administradora pode liberar novos administradores
            ou geradores. O convite expira em sete dias.
          </p>
        </div>
        <form onSubmit={submitInvite}>
          <label>
            Tipo de acesso
            <select value={form.perfil} onChange={(event) => setForm({ ...form, perfil: event.target.value })}>
              <option value="GESTOR">Gerador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <label>
            Nome completo
            <input
              required
              value={form.nome}
              onChange={(event) =>
                setForm({ ...form, nome: event.target.value })
              }
            />
          </label>
          <label>
            CPF
            <input
              required
              maxLength={11}
              inputMode="numeric"
              value={form.cpf}
              onChange={(event) =>
                setForm({ ...form, cpf: event.target.value.replace(/\D/g, "") })
              }
            />
          </label>
          <label>
            E-mail
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          {message && <div className="invite-message">{message}</div>}
          <button disabled={sending}>
            {sending ? "Enviando..." : "Enviar convite seguro"}
          </button>
        </form>
      </div>
      <div className="section-workspace generator-accounts">
        <div className="data-toolbar">
          <div>
            <small>CONTAS GERADORAS</small>
            <strong>
              {accounts.length} conta{accounts.length === 1 ? "" : "s"}
            </strong>
          </div>
          <button onClick={() => void loadAccounts()}>Atualizar</button>
        </div>
        {loadingAccounts ? (
          <div className="data-state">Carregando contas...</div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={String(account.id)}>
                    <td>{String(account.nome ?? "—")}</td>
                    <td>{String(account.email ?? "—")}</td>
                    <td>{String(account.perfil ?? "—")}</td>
                    <td>
                      <span className="table-status">
                        {account.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td>
                      {account.perfil === "ADMIN" ? (
                        <small>Conta principal</small>
                      ) : (
                        <button
                          className="table-action"
                          onClick={() => void toggleAccount(account)}
                        >
                          {account.ativo ? "Desativar" : "Ativar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CompaniesPanel({ token }: { token: string }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ nome: "", documento: "", emailSuporte: "", corPrimaria: "#087A46", corSecundaria: "#F7D75C", identidadePersonalizada: false });
  const load = useCallback(async () => {
    const response = await fetch(`${API_URL}/empresas`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => []);
    if (!response.ok) throw new Error(payload.message ?? "Não foi possível carregar as empresas.");
    setCompanies(Array.isArray(payload) ? payload : []);
  }, [token]);
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`${API_URL}/empresas`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(payload.message ?? "Não foi possível cadastrar a empresa.");
    setForm({ nome: "", documento: "", emailSuporte: "", corPrimaria: "#087A46", corSecundaria: "#F7D75C", identidadePersonalizada: false });
    setMessage("Empresa parceira cadastrada. Agora vincule seus administradores e sua assinatura.");
    await load();
  }
  return <div className="commercial-stack"><section className="commercial-home-hero"><div><small>ECOSSISTEMA ANDRADE ENERGY</small><h2>Empresas parceiras</h2><p>Ambientes isolados com a identidade Andrade Energy por padrão e personalização opcional.</p></div><b>{companies.length}</b></section><div className="commercial-columns"><section className="section-workspace"><span className="section-label">NOVA EMPRESA</span><h2>Cadastrar parceira</h2><form className="commercial-form" onSubmit={create}><label>Nome<input required value={form.nome} onChange={(event)=>setForm({...form,nome:event.target.value})}/></label><label>CPF/CNPJ<input value={form.documento} onChange={(event)=>setForm({...form,documento:event.target.value})}/></label><label>E-mail de suporte<input type="email" value={form.emailSuporte} onChange={(event)=>setForm({...form,emailSuporte:event.target.value})}/></label><div className="commercial-form-row"><label>Cor principal<input type="color" value={form.corPrimaria} onChange={(event)=>setForm({...form,corPrimaria:event.target.value})}/></label><label>Cor de destaque<input type="color" value={form.corSecundaria} onChange={(event)=>setForm({...form,corSecundaria:event.target.value})}/></label></div><label className="checkbox-field"><input checked={form.identidadePersonalizada} type="checkbox" onChange={(event)=>setForm({...form,identidadePersonalizada:event.target.checked})}/> Usar identidade personalizada</label><button className="primary-action">Cadastrar empresa</button></form>{message?<div className="invite-message">{message}</div>:null}</section><section className="section-workspace"><span className="section-label">AMBIENTES</span><h2>{companies.length} empresa(s)</h2><div className="document-grid">{companies.map((company)=><article key={company.id}><b style={{background:company.cor_primaria,color:company.cor_secundaria}}>{String(company.nome).slice(0,2).toUpperCase()}</b><div><strong>{company.nome}</strong><small>{company.empresa_proprietaria?"Empresa proprietária":company.identidade_personalizada?"Identidade personalizada":"Padrão Andrade Energy"} · {company.ativo?"Ativa":"Inativa"}</small></div></article>)}</div></section></div></div>;
}

function CommercialManagementPanel({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [selectedGeneratorId, setSelectedGeneratorId] = useState<string | null>(null);
  const primeiroVencimento = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ geradorId: "", planoId: "", ciclo: "MENSAL", formaPagamento: "BOLETO", proximoVencimento: primeiroVencimento });
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/comercial/painel`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível carregar a gestão comercial.");
      setData(payload);
      setForm((current) => ({ ...current, geradorId: current.geradorId || payload.geradores?.find((item: any) => item.perfil === "GESTOR")?.id || "", planoId: current.planoId || payload.planos?.[0]?.id || "" }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao carregar."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token]);
  const request = async (path: string, options: RequestInit) => {
    setMessage("");
    const response = await fetch(`${API_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? "Operação não concluída.");
    return payload;
  };
  const createSubscription = async (event: FormEvent) => {
    event.preventDefault();
    try { const result = await request("/comercial/assinaturas", { method: "POST", body: JSON.stringify({ ...form, diasTeste: 45, inicioEm: new Date().toISOString().slice(0, 10) }) }); setMessage(result.teste_concedido ? "Plano vinculado com 45 dias de teste antes da primeira cobrança." : "Plano vinculado. Este CPF já utilizou o teste gratuito; a assinatura foi ativada sem novo período de teste."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível vincular."); }
  };
  const action = async (subscription: any, kind: "charge" | "status", status?: string) => {
    try {
      const result = await request(kind === "charge" ? `/comercial/assinaturas/${subscription.id}/cobrancas` : `/comercial/assinaturas/${subscription.id}/status`, kind === "charge" ? { method: "POST" } : { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(kind === "charge" ? "Cobrança gerada. O link já está disponível no histórico comercial." : "Situação da assinatura atualizada.");
      if (kind === "charge" && result.invoice_url) window.open(result.invoice_url, "_blank", "noopener,noreferrer");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ação não concluída."); }
  };
  if (loading && !data) return <div className="data-state">Carregando gestão comercial...</div>;
  const money = (value: unknown) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dateValue = (value: unknown) => new Date(`${String(value ?? "").slice(0, 10)}T12:00:00`).getTime();
  const elapsedDays = (value: unknown) => Math.max(0, Math.floor((dateValue(new Date().toISOString()) - dateValue(value)) / 86_400_000));
  const monitored = (data?.assinaturas ?? []).filter((item: any) => ["TESTE", "ATIVA", "INADIMPLENTE", "SUSPENSA"].includes(String(item.status))).filter((item: any) => `${item.gerador?.nome ?? ""} ${item.gerador?.email ?? ""} ${item.plano?.nome ?? ""}`.toLowerCase().includes(monitorSearch.trim().toLowerCase()));
  const selectedGenerator = (data?.geradores ?? []).find((item: any) => String(item.id) === selectedGeneratorId);
  const selectedSubscription = (data?.assinaturas ?? []).find((item: any) => String(item.gerador_id) === selectedGeneratorId);
  return <div className="commercial-stack">
    <section className="commercial-home-hero"><div><small>GESTÃO DE GERADORES</small><h2>Operação comercial do software</h2><p>Geradores, licenças, planos, cobranças e conformidade em uma visão profissional.</p></div><b>↗</b></section>
    <nav className="commercial-tabs" aria-label="Áreas da gestão comercial"><button onClick={()=>document.getElementById("comercial-resumo")?.scrollIntoView({behavior:"smooth"})}>Visão geral</button><button onClick={()=>document.getElementById("comercial-monitoramento")?.scrollIntoView({behavior:"smooth"})}>Clientes ativos</button><button onClick={()=>document.getElementById("comercial-pagamentos")?.scrollIntoView({behavior:"smooth"})}>Pagamentos</button><button onClick={()=>document.getElementById("comercial-geradores")?.scrollIntoView({behavior:"smooth"})}>Geradores</button><button onClick={()=>document.getElementById("comercial-planos")?.scrollIntoView({behavior:"smooth"})}>Planos</button><button onClick={()=>document.getElementById("comercial-assinaturas")?.scrollIntoView({behavior:"smooth"})}>Assinaturas</button><button onClick={()=>document.getElementById("comercial-aplicativos")?.scrollIntoView({behavior:"smooth"})}>Aplicativos</button><button onClick={()=>document.getElementById("comercial-documentos")?.scrollIntoView({behavior:"smooth"})}>Documentos</button></nav>
    <section className="commercial-finance" id="comercial-resumo"><article className="commercial-revenue"><small>RECEITA MENSAL PREVISTA</small><strong>{money(data?.resumo?.receitaMensalPrevista)}</strong><footer><span>Recebido {money(data?.financeiro?.recebidoNoMes)}</span><span>Pendente {money(data?.financeiro?.pendenteNoMes)}</span></footer></article><article className="commercial-wallet"><small>CARTEIRA COMERCIAL</small><strong>{money(data?.financeiro?.totalRecebido)}</strong><span>Total confirmado</span><footer><b>{data?.financeiro?.cobrancasPendentes ?? 0} pendentes</b><b className="danger-text">{data?.financeiro?.cobrancasVencidas ?? 0} vencidas</b></footer></article></section>
    <div className="commercial-metrics">
      <article><small>ASSINATURAS</small><strong>{data?.resumo?.total ?? 0}</strong><span>Contas comercializadas</span></article>
      <article><small>ATIVAS / TESTE</small><strong>{data?.resumo?.ativas ?? 0}</strong><span>Com acesso liberado</span></article>
      <article><small>INADIMPLENTES</small><strong className="danger-text">{data?.resumo?.inadimplentes ?? 0}</strong><span>Precisam de ação</span></article>
      <article><small>MRR PREVISTO</small><strong>{money(data?.resumo?.receitaMensalPrevista)}</strong><span>Receita mensal equivalente</span></article>
    </div>
    <section className="section-workspace" id="comercial-pagamentos"><div className="data-toolbar"><div><small>PAGAMENTOS E FATURAMENTO</small><strong>{data?.cobrancas?.length ?? 0} cobrança(s)</strong></div><span>{money(data?.financeiro?.vencidoNoMes)} vencido no mês</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Gerador</th><th>Plano</th><th>Competência</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead><tbody>{(data?.cobrancas ?? []).map((item:any)=><tr key={item.id}><td>{item.assinatura?.gerador?.nome ?? "Gerador"}</td><td>{item.assinatura?.plano?.nome ?? "Licença"}</td><td>{item.competencia}</td><td>{money(item.valor)}</td><td>{item.vencimento ? new Date(`${item.vencimento}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td><td><span className={`table-status status-${String(item.status).toLowerCase()}`}>{item.status}</span></td><td>{item.bank_slip_url || item.invoice_url ? <a className="table-action" href={item.bank_slip_url ?? item.invoice_url} rel="noreferrer" target="_blank">Abrir</a> : "—"}</td></tr>)}</tbody></table></div>{!data?.cobrancas?.length?<div className="data-state">Nenhuma cobrança gerada até o momento.</div>:null}<p className="commercial-payment-note">A conciliação é automática pelo Asaas. Cartão e Pix recorrentes são opcionais; boleto, Pix e cobrança avulsa continuam disponíveis.</p></section>
    <section className="section-workspace commercial-monitor" id="comercial-monitoramento"><div className="data-toolbar"><div><small>MONITORAMENTO DE CLIENTES</small><strong>{monitored.length} cliente(s) ativo(s)</strong></div><input aria-label="Buscar cliente ativo" onChange={(event)=>setMonitorSearch(event.target.value)} placeholder="Buscar nome, e-mail ou plano" value={monitorSearch}/></div><div className="commercial-client-grid">{monitored.map((item:any)=>{const elapsed=elapsedDays(item.inicio_em);const trialTotal=item.fim_teste_em?Math.max(1,Math.floor((dateValue(item.fim_teste_em)-dateValue(item.inicio_em))/86_400_000)):45;const trialUsed=Math.min(trialTotal,elapsed);const remaining=Math.max(0,trialTotal-trialUsed);return <article className="commercial-client-card" key={item.id}><div className="commercial-client-heading"><span>{String(item.gerador?.nome??"G").charAt(0).toUpperCase()}</span><div><strong>{item.gerador?.nome??"Gerador"}</strong><small>{item.gerador?.email??"E-mail não informado"}</small></div><em className={`table-status status-${String(item.status).toLowerCase()}`}>{item.status}</em></div><div className="commercial-days"><b>{elapsed}<small>dias decorridos</small></b><span><strong>{item.plano?.nome??"Plano"}</strong><small>{String(item.ciclo??"").toLowerCase()} · início {new Date(`${item.inicio_em}T12:00:00`).toLocaleDateString("pt-BR")}</small></span></div>{item.status==="TESTE"?<><div className="commercial-trial-track"><i style={{width:`${Math.min(100,trialUsed/trialTotal*100)}%`}}/></div><div className="commercial-trial-legend"><span>{trialUsed} de {trialTotal} dias usados</span><strong>{remaining} dias restantes</strong></div></>:null}<footer><span><small>PRÓXIMO VENCIMENTO</small><strong>{item.proximo_vencimento?new Date(`${item.proximo_vencimento}T12:00:00`).toLocaleDateString("pt-BR"):"Não definido"}</strong></span><button onClick={()=>document.getElementById("comercial-assinaturas")?.scrollIntoView({behavior:"smooth"})}>Gerenciar →</button></footer></article>})}</div>{!monitored.length?<div className="data-state">Nenhum cliente ativo encontrado.</div>:null}</section>
    <section className="section-workspace commercial-generators-list">
      <div className="data-toolbar"><div><small>CONTAS GERADORAS</small><strong>{(data?.geradores ?? []).filter((item:any)=>item.perfil === "GESTOR").length} gerador(es)</strong></div></div>
      <div className="commercial-generator-grid">{(data?.geradores ?? []).filter((item:any)=>item.perfil === "GESTOR").map((item:any)=><button key={item.id} onClick={()=>setSelectedGeneratorId(String(item.id))}><b>{String(item.nome??"G").charAt(0).toUpperCase()}</b><span><strong>{item.nome??"Gerador"}</strong><small>{item.email??"E-mail não informado"}</small><em>{item.total_usinas??0} usina(s) · {item.total_ucs_ativas??0} UC(s) ativa(s)</em></span><i>Ver detalhes →</i></button>)}</div>
      {selectedGenerator ? <article className="commercial-generator-detail"><button aria-label="Fechar detalhes" onClick={()=>setSelectedGeneratorId(null)}>×</button><div><small>GERADOR SELECIONADO</small><h3>{selectedGenerator.nome}</h3><p>{selectedGenerator.email} · {selectedGenerator.telefone || "Telefone não informado"}</p></div><dl><div><dt>Status</dt><dd>{selectedGenerator.ativo ? "Ativo" : "Inativo"}</dd></div><div><dt>Plano</dt><dd>{selectedSubscription?.plano?.nome ?? "Sem assinatura"}</dd></div><div><dt>Assinatura</dt><dd>{selectedSubscription?.status ?? "Não contratada"}</dd></div><div><dt>Vencimento</dt><dd>{selectedSubscription?.proximo_vencimento ? new Date(`${selectedSubscription.proximo_vencimento}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</dd></div><div><dt>Usinas</dt><dd>{selectedGenerator.total_usinas ?? 0}</dd></div><div><dt>UCs ativas</dt><dd>{selectedGenerator.total_ucs_ativas ?? 0}</dd></div></dl></article> : null}
    </section>
    <div className="commercial-columns">
      <section className="section-workspace" id="comercial-geradores">
        <span className="section-label">NOVA ASSINATURA</span><h2>Vincular plano ao gerador</h2><p>Crie o contrato comercial sem misturar a mensalidade do software com as faturas de energia.</p>
        <form className="commercial-form" onSubmit={createSubscription}>
          <label>Gerador<select required value={form.geradorId} onChange={(e) => setForm({ ...form, geradorId: e.target.value })}><option value="">Selecione</option>{(data?.geradores ?? []).filter((item: any) => item.perfil === "GESTOR").map((item: any) => <option key={item.id} value={item.id}>{item.nome} · {item.email}</option>)}</select></label>
          <label>Plano<select required value={form.planoId} onChange={(e) => setForm({ ...form, planoId: e.target.value })}>{(data?.planos ?? []).filter((item: any) => item.ativo).map((item: any) => <option key={item.id} value={item.id}>{item.nome} · {money(item.valor_mensal)}/mês</option>)}</select></label>
          <div className="commercial-form-row"><label>Ciclo<select value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: e.target.value })}><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select></label><label>Pagamento<select value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}><option value="BOLETO">Boleto</option><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão</option></select></label></div>
          <label>Primeiro vencimento<input required type="date" value={form.proximoVencimento} onChange={(e) => setForm({ ...form, proximoVencimento: e.target.value })} /></label>
          <button className="primary-action">Ativar assinatura</button>
        </form>
      </section>
      <section className="section-workspace" id="comercial-planos"><span className="section-label">PLANOS</span><h2>Oferta comercial</h2>{(data?.planos ?? []).map((plan: any) => <article className="commercial-plan" key={plan.id}><div><strong>{plan.nome}</strong><small>{plan.descricao}</small></div><b>{money(plan.valor_mensal)}<small>/mês</small></b><p>{(plan.recursos ?? []).join(" • ")}</p><span>Anual {money(plan.valor_anual)}</span></article>)}</section>
    </div>
    {message ? <div className="invite-message">{message}</div> : null}
    <section className="section-workspace" id="comercial-assinaturas"><div className="data-toolbar"><div><small>CARTEIRA COMERCIAL</small><strong>{data?.assinaturas?.length ?? 0} assinatura(s)</strong></div><button onClick={() => void load()}>Atualizar</button></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Gerador</th><th>Plano</th><th>Ciclo</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>{(data?.assinaturas ?? []).map((item: any) => <tr key={item.id}><td><strong>{item.gerador?.nome ?? "—"}</strong><small className="table-subline">{item.gerador?.email ?? "—"}</small></td><td>{item.plano?.nome ?? "—"}</td><td>{item.ciclo}</td><td>{money(item.valor_contratado)}</td><td>{item.proximo_vencimento ? new Date(`${item.proximo_vencimento}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td><td><span className={`table-status status-${String(item.status).toLowerCase()}`}>{item.status}</span></td><td><div className="row-actions"><button className="table-action" onClick={() => void action(item, "charge")}>Cobrar</button><button className="table-action" onClick={() => void action(item, "status", item.status === "SUSPENSA" ? "ATIVA" : "SUSPENSA")}>{item.status === "SUSPENSA" ? "Reativar" : "Suspender"}</button><button className="table-action danger" onClick={() => window.confirm("Cancelar definitivamente esta assinatura?") && void action(item, "status", "CANCELADA")}>Cancelar</button></div></td></tr>)}</tbody></table></div>
    </section>
    <section className="section-workspace commercial-apps" id="comercial-aplicativos"><span className="section-label">APLICATIVOS</span><h2>Instalação no Android</h2><p>Baixe as versões atuais. O aplicativo do Gerador libera um teste de 45 dias por CPF; reinstalar ou recriar a conta não renova o benefício.</p><div><AppDownloadLink href={APP_GERADOR_URL} app="Gerador" description="Gestão de usinas · teste de 45 dias" /><AppDownloadLink href={APP_CONSUMIDOR_URL} app="Consumidor" description="Faturas, economia e contratos" /></div>{!APP_GERADOR_URL || !APP_CONSUMIDOR_URL ? <small className="commercial-build-note">Nova versão em publicação. O botão será liberado assim que o APK atualizado estiver disponível.</small> : null}</section>
    <section className="section-workspace" id="comercial-documentos"><span className="section-label">CONFORMIDADE</span><h2>Documentos para comercialização</h2><div className="document-grid">{(data?.documentos ?? []).map((doc: any) => <article key={doc.id}><b>§</b><div><strong>{doc.titulo}</strong><small>Versão {doc.versao} · {doc.ativo ? "Publicada" : "Rascunho"}</small></div></article>)}</div><p className="legal-notice">Os modelos são uma base operacional. Antes da venda ao público, contrato, termos, política de privacidade e cancelamento devem ser revisados por advogado e responsável por proteção de dados.</p></section>
  </div>;
}

function AppDownloadsPanel() {
  return <section className="section-workspace commercial-apps app-downloads-panel">
    <span className="section-label">APLICATIVOS ANDRADE ENERGY</span>
    <h2>Instale o aplicativo ideal para seu perfil</h2>
    <p>Baixe diretamente a versão Android mais recente. O app Gerador reúne a operação das usinas e a gestão comercial; o app Consumidor concentra faturas, economia e contratos.</p>
    <div>
      <AppDownloadLink href={APP_GERADOR_URL} app="Gerador" description="Gestão comercial e gestão de usinas · aprox. 103 MB" detailed />
      <AppDownloadLink href={APP_CONSUMIDOR_URL} app="Consumidor" description="Faturas, economia e contratos · aprox. 103 MB" detailed />
    </div>
    <small className="app-download-security">Arquivos oficiais para Android. Depois que o download terminar, abra o arquivo na área Downloads do celular para iniciar a instalação.</small>
  </section>;
}

function ProfilePanel({
  token,
  fallback,
}: {
  token: string;
  fallback?: PortalSession["usuario"];
}) {
  const [profile, setProfile] = useState({
    nome: fallback?.nome ?? "",
    email: fallback?.email ?? "",
    telefone: "",
  });
  const [passwords, setPasswords] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmar: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setProfile({
          nome: data.nome ?? "",
          email: data.email ?? "",
          telefone: data.telefone ?? "",
        });
      }
    });
  }, [token]);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Perfil atualizado com sucesso."
        : (data.message ?? "Não foi possível atualizar o perfil."),
    );
    setSaving(false);
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (passwords.novaSenha !== passwords.confirmar) {
      setMessage("A confirmação da nova senha não confere.");
      return;
    }
    setSaving(true);
    const response = await fetch(`${API_URL}/auth/me/senha`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senhaAtual: passwords.senhaAtual,
        novaSenha: passwords.novaSenha,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Senha alterada com sucesso."
        : (data.message ?? "Não foi possível alterar a senha."),
    );
    if (response.ok)
      setPasswords({ senhaAtual: "", novaSenha: "", confirmar: "" });
    setSaving(false);
  }
  return (
    <div className="profile-grid">
      <section className="section-workspace profile-card">
        <span className="section-label">DADOS PESSOAIS</span>
        <h2>Seu perfil</h2>
        <div className="profile-avatar">
          {(profile.nome || "U").slice(0, 1).toUpperCase()}
        </div>
        <form onSubmit={saveProfile}>
          <label>
            Nome completo
            <input
              required
              value={profile.nome}
              onChange={(event) =>
                setProfile({ ...profile, nome: event.target.value })
              }
            />
          </label>
          <label>
            E-mail
            <input
              required
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile({ ...profile, email: event.target.value })
              }
            />
          </label>
          <label>
            Telefone
            <input
              value={profile.telefone}
              onChange={(event) =>
                setProfile({ ...profile, telefone: event.target.value })
              }
            />
          </label>
          <button disabled={saving}>Salvar dados</button>
        </form>
      </section>
      <section className="section-workspace profile-card">
        <span className="section-label">SEGURANÇA</span>
        <h2>Alterar senha</h2>
        <p>
          Use uma senha exclusiva, com letras, números e caracteres especiais.
        </p>
        <form onSubmit={savePassword}>
          <label>
            Senha atual
            <input
              required
              type="password"
              value={passwords.senhaAtual}
              onChange={(event) =>
                setPasswords({ ...passwords, senhaAtual: event.target.value })
              }
            />
          </label>
          <label>
            Nova senha
            <input
              required
              minLength={8}
              type="password"
              value={passwords.novaSenha}
              onChange={(event) =>
                setPasswords({ ...passwords, novaSenha: event.target.value })
              }
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              required
              minLength={8}
              type="password"
              value={passwords.confirmar}
              onChange={(event) =>
                setPasswords({ ...passwords, confirmar: event.target.value })
              }
            />
          </label>
          <button disabled={saving}>Atualizar senha</button>
        </form>
        {message && <div className="invite-message">{message}</div>}
      </section>
    </div>
  );
}

function AccountSettingsPanel() {
  const initial = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("andrade_energy_preferences") ?? "null",
      );
    } catch {
      return null;
    }
  })() ?? { email: true, vencimentos: true, relatorios: false, compact: false };
  const [settings, setSettings] = useState<Record<string, boolean>>(initial);
  const [saved, setSaved] = useState(false);
  function toggle(key: string) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  }
  function save() {
    localStorage.setItem(
      "andrade_energy_preferences",
      JSON.stringify(settings),
    );
    setSaved(true);
  }
  return (
    <div className="settings-layout">
      <section className="section-workspace">
        <span className="section-label">PREFERÊNCIAS</span>
        <h2>Configurações da conta</h2>
        <p className="settings-lead">
          Escolha como deseja acompanhar sua energia e receber avisos do portal.
        </p>
        {[
          [
            "email",
            "Notificações por e-mail",
            "Avisos importantes sobre sua conta e documentos.",
          ],
          [
            "vencimentos",
            "Lembretes de vencimento",
            "Receba alertas antes do vencimento das faturas.",
          ],
          [
            "relatorios",
            "Resumo mensal",
            "Receba um relatório mensal de energia e economia.",
          ],
          [
            "compact",
            "Visualização compacta",
            "Exiba mais informações por linha nas tabelas.",
          ],
        ].map(([key, title, description]) => (
          <button
            type="button"
            className="setting-row"
            key={key}
            onClick={() => toggle(key)}
          >
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <i className={settings[key] ? "on" : ""}>
              <b />
            </i>
          </button>
        ))}
        <button className="settings-save" onClick={save}>
          Salvar preferências
        </button>
        {saved && (
          <div className="invite-message">
            Preferências salvas neste navegador.
          </div>
        )}
      </section>
      <aside className="security-summary">
        <small>CONTA PROTEGIDA</small>
        <strong>Sessão autenticada</strong>
        <p>Seus dados de energia são acessados somente após autenticação.</p>
        <span>✓ Conexão segura</span>
        <span>✓ Dados segregados por perfil</span>
        <span>✓ Controle de acesso ativo</span>
      </aside>
    </div>
  );
}

type WalletSummary = {
  status: string;
  asaasConectado: boolean;
  transferenciaAutomatica: boolean;
  pixTipo?: string | null;
  pixChaveMascarada?: string | null;
  saldoDisponivel: number;
  saldoPendente: number;
  totalRecebido: number;
  totalTransferido: number;
  transferencias: Array<Record<string, unknown>>;
};

function WalletPanel({ token }: { token: string }) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [form, setForm] = useState({
    pixTipo: "EMAIL",
    pixChave: "",
    transferenciaAutomatica: false,
  });
  const [withdrawal, setWithdrawal] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const money = (value: number) =>
    Number(value ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  async function load() {
    const response = await fetch(`${API_URL}/carteira`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message ?? "Não foi possível carregar a carteira.");
    const translated = {
      ...data,
      transferencias: (data.transferencias ?? []).map((item: WebRecord) => ({
        ...item,
        status: formatPortalValue("status", item.status),
      })),
    };
    setWallet(translated);
    setForm((current) => ({
      ...current,
      pixTipo: data.pixTipo ?? "EMAIL",
      transferenciaAutomatica: Boolean(data.transferenciaAutomatica),
    }));
  }
  useEffect(() => {
    void load().catch((error) => setMessage(error.message));
  }, [token]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/carteira`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message ?? "Não foi possível salvar.");
      setWallet(data);
      setForm((current) => ({ ...current, pixChave: "" }));
      setMessage("Preferências financeiras salvas com segurança.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    const value = Number(withdrawal.replace(",", "."));
    if (
      !(value > 0) ||
      !window.confirm(
        `Transferir ${money(value)} para sua chave Pix cadastrada?`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/carteira/transferencias`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ valor: value, confirmacao: "TRANSFERIR" }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message ?? "Transferência não concluída.");
      setWithdrawal("");
      setMessage("Transferência solicitada. Acompanhe o status no extrato.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha na transferência.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!wallet)
    return (
      <div className="section-workspace data-state">
        Carregando sua carteira...
      </div>
    );
  return (
    <div className="wallet-layout">
      <section className="wallet-hero">
        <div>
          <small>SALDO DISPONÍVEL</small>
          <strong>{money(wallet.saldoDisponivel)}</strong>
          <span>{money(wallet.saldoPendente)} a receber</span>
        </div>
        <i>R$</i>
      </section>
      <div className="wallet-metrics">
        <article>
          <small>Total recebido</small>
          <strong>{money(wallet.totalRecebido)}</strong>
        </article>
        <article>
          <small>Total transferido</small>
          <strong>{money(wallet.totalTransferido)}</strong>
        </article>
        <article>
          <small>Conta financeira</small>
          <strong>{wallet.asaasConectado ? "Conectada" : "Pendente"}</strong>
        </article>
      </div>
      <div className="wallet-columns">
        <section className="section-workspace wallet-settings">
          <span className="section-label">RECEBIMENTO</span>
          <h2>Destino e automação</h2>
          <p>
            Configure uma chave Pix exclusiva deste gerador. Os demais logins
            terão carteiras e destinos separados.
          </p>
          <form onSubmit={save}>
            <label>
              Tipo da chave
              <select
                value={form.pixTipo}
                onChange={(event) =>
                  setForm({ ...form, pixTipo: event.target.value })
                }
              >
                <option value="EMAIL">E-mail</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="PHONE">Telefone</option>
                <option value="EVP">Chave aleatória</option>
              </select>
            </label>
            <label>
              Chave Pix
              <input
                value={form.pixChave}
                onChange={(event) =>
                  setForm({ ...form, pixChave: event.target.value })
                }
                placeholder={wallet.pixChaveMascarada ?? "Informe sua chave"}
              />
            </label>
            <button
              type="button"
              className={`wallet-toggle ${form.transferenciaAutomatica ? "on" : ""}`}
              onClick={() =>
                setForm({
                  ...form,
                  transferenciaAutomatica: !form.transferenciaAutomatica,
                })
              }
            >
              <span>
                <strong>Transferir automaticamente</strong>
                <small>
                  Enviar para o Pix sempre que uma cobrança for recebida.
                </small>
              </span>
              <i>
                <b />
              </i>
            </button>
            <button disabled={busy} className="settings-save">
              Salvar configuração
            </button>
          </form>
        </section>
        <section className="section-workspace wallet-withdraw">
          <span className="section-label">SAQUE MANUAL</span>
          <h2>Transferir saldo</h2>
          <p>
            Destino atual:{" "}
            <strong>{wallet.pixChaveMascarada ?? "não configurado"}</strong>
          </p>
          <label>
            Valor disponível
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={wallet.saldoDisponivel}
              value={withdrawal}
              onChange={(event) => setWithdrawal(event.target.value)}
              placeholder="0,00"
            />
          </label>
          <button
            disabled={
              busy || !wallet.pixChaveMascarada || wallet.saldoDisponivel <= 0
            }
            onClick={() => void withdraw()}
          >
            Transferir via Pix
          </button>
          <small>
            Por segurança, toda solicitação é registrada e validada antes do
            envio.
          </small>
        </section>
      </div>
      {message && <div className="invite-message">{message}</div>}
      <section className="section-workspace wallet-history">
        <div className="data-toolbar">
          <div>
            <small>EXTRATO</small>
            <strong>Últimas transferências</strong>
          </div>
          <button onClick={() => void load()}>Atualizar</button>
        </div>
        {wallet.transferencias.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Modalidade</th>
                  <th>Destino</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transferencias.map((item, index) => (
                  <tr key={String(item.id ?? index)}>
                    <td>
                      {new Date(String(item.criado_em)).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td>{String(item.modalidade ?? "—")}</td>
                    <td>{String(item.destino_mascarado ?? "—")}</td>
                    <td>{money(Number(item.valor))}</td>
                    <td>
                      <span className="table-status">
                        {String(item.status ?? "—")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="data-state">Nenhuma transferência realizada.</div>
        )}
      </section>
    </div>
  );
}

function SectionInsights({
  section,
  records,
}: {
  section: string;
  records: WebRecord[];
}) {
  if (
    ![
      "Operação",
      "Financeiro",
      "Economia",
      "Faturas",
      "Contratos",
      "Contas de luz",
    ].includes(section)
  )
    return null;
  const amounts = records.map((item) =>
    Number(
      item.receita_realizada ??
        item.receitaRealizada ??
        item.valor_total_unificado ??
        item.valor_total ??
        item.valor ??
        item.economia ??
        0,
    ),
  );
  const total = amounts.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  const energy = records.reduce(
    (sum, item) =>
      sum +
      Number(
        item.energia_gerada ??
          item.energiaGerada ??
          item.consumo ??
          item.creditos ??
          0,
      ),
    0,
  );
  const bars = (
    amounts.length ? amounts.slice(-8) : [22, 38, 31, 54, 47, 65, 58, 78]
  ).map((value) =>
    Math.max(
      10,
      Math.min(100, value ? (value / Math.max(...amounts, value)) * 100 : 18),
    ),
  );
  return (
    <div className="section-insights">
      <article>
        <small>
          {section === "Operação" || section === "Economia"
            ? "ENERGIA CONSOLIDADA"
            : "VALOR CONSOLIDADO"}
        </small>
        <strong>
          {section === "Operação" || section === "Economia"
            ? `${energy.toLocaleString("pt-BR")} kWh`
            : total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
        </strong>
        <span>
          {records.length} lançamento{records.length === 1 ? "" : "s"} no
          período
        </span>
      </article>
      <article className="mini-chart-card">
        <div>
          <small>EVOLUÇÃO</small>
          <strong>Últimos lançamentos</strong>
        </div>
        <div className="mini-bars">
          {bars.map((value, index) => (
            <i key={index} style={{ height: `${value}%` }} />
          ))}
        </div>
      </article>
      <article>
        <small>STATUS DA CARTEIRA</small>
        <strong>
          {
            records.filter((item) =>
              /pago|ativo|fechado|aceito/i.test(String(item.status ?? "")),
            ).length
          }
        </strong>
        <span>registros concluídos ou ativos</span>
      </article>
    </div>
  );
}

function UnitTools({
  unit,
  token,
  onChanged,
}: {
  unit: WebRecord;
  token: string;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<WebRecord | null>(null);
  const [connections, setConnections] = useState<WebRecord[]>([]);
  const [latestInvoice, setLatestInvoice] = useState<WebRecord | null>(null);
  const [toolsRefresh, setToolsRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [plants, setPlants] = useState<WebRecord[]>([]);
  const [allocation, setAllocation] = useState({
    usinaId: String(unit.usina_id ?? ""),
    modalidade: String(
      unit.modalidade_faturamento ?? unit.modalidade ?? "COMPENSACAO",
    ),
    percentual: String(unit.percentual_rateio ?? unit.percentual ?? ""),
    desconto: String(unit.desconto_percentual ?? unit.desconto ?? "40"),
    consumoMedio: String(unit.consumo_medio_kwh ?? ""),
    formatoFatura: unit.fatura_somente_andrade
      ? "SOMENTE_ANDRADE"
      : "UNIFICADA",
    gd1: unit.repassar_disponibilidade_gd1 === false ? "ABSORVER" : "REPASSAR",
    gd2: unit.repassar_disponibilidade_gd2 === false ? "ABSORVER" : "REPASSAR",
    fioB: unit.repassar_diferenca_fio_b_gd2 === false ? "ABSORVER" : "REPASSAR",
    tipoGd: String(unit.tipo_gd ?? ""),
  });
  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const unitNumber = String(unit.numero ?? unit.uc ?? "").trim();
    void Promise.all([
      fetch(`${API_URL}/recebimento-faturas/unidades/${unit.id}`, { headers }),
      fetch(`${API_URL}/conexoes-email/unidades/${unit.id}`, { headers }),
      unitNumber
        ? fetch(`${API_URL}/faturas?uc=${encodeURIComponent(unitNumber)}`, { headers })
        : Promise.resolve(null),
    ])
      .then(async ([receiptResponse, connectionResponse, invoiceResponse]) => ({
        receipt: receiptResponse.ok ? await receiptResponse.json() : null,
        connections: connectionResponse.ok
          ? await connectionResponse.json()
          : {},
        invoices: invoiceResponse?.ok ? await invoiceResponse.json() : [],
      }))
      .then((data) => {
        setReceipt(data.receipt);
        setConnections(
          Array.isArray(data.connections?.conexoes)
            ? data.connections.conexoes
            : [],
        );
        const invoices = Array.isArray(data.invoices)
          ? data.invoices
          : Array.isArray(data.invoices?.data)
            ? data.invoices.data
            : [];
        setLatestInvoice(invoices[0] ?? null);
      })
      .catch(() => undefined);
  }, [unit.id, token, toolsRefresh]);
  async function request(
    endpoint: string,
    method = "POST",
    body?: BodyInit,
    headers?: Record<string, string>,
    refreshParent = true,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(headers ?? {}) },
        body,
      });
      const data = await response.json().catch(() => ({}));
      setMessage(
        response.ok
          ? (data.mensagem ??
              data.message ??
              (data.endereco
                ? `Novo endereço: ${data.endereco}`
                : "Operação concluída."))
          : (data.message ?? "Não foi possível concluir."),
      );
      if (response.ok) {
        if (data.endereco || typeof data.ativo === "boolean") setReceipt(data);
        setToolsRefresh((value) => value + 1);
        if (refreshParent) onChanged();
      }
    } catch {
      setMessage("Não foi possível acessar o servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadContract(file: File | null) {
    if (!file) return;
    const body = new FormData();
    body.append("arquivo", file);
    await request(
      `/contratos/unidade/${unit.id}/contrato-assinado`,
      "POST",
      body,
    );
  }
  async function connectEmail(provider: "GMAIL" | "OUTLOOK") {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `${API_URL}/conexoes-email/unidades/${unit.id}/iniciar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provedor: provider, app: "GERADOR" }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok && data.url) {
      const oauth = window.open(data.url, "_blank", "noopener,noreferrer");
      setMessage(
        oauth
          ? `A autorização do ${provider === "GMAIL" ? "Gmail" : "Outlook"} foi aberta em uma nova aba. Conclua o acesso e depois atualize esta UC.`
          : "O navegador bloqueou a nova aba. Permita pop-ups para conectar a conta.",
      );
    } else
      setMessage(
        data.message ??
          "Não foi possível iniciar a conexão. Confira a configuração do provedor no servidor.",
      );
  }
  async function openAllocationEditor() {
    setEditOpen(true);
    if (plants.length) return;
    const response = await fetch(`${API_URL}/usinas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => []);
    if (response.ok)
      setPlants(
        Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
      );
  }
  async function saveAllocation(event: FormEvent) {
    event.preventDefault();
    if (!allocation.usinaId || !unit.cliente_id) {
      setMessage(
        "Selecione a usina e confirme se a UC está vinculada a um cliente.",
      );
      return;
    }
    setBusy(true);
    const response = await fetch(
      `${API_URL}/usinas/${allocation.usinaId}/alocar-unidade`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: unit.cliente_id,
          numero: unit.numero ?? unit.uc,
          modalidade: allocation.modalidade,
          percentual: Number(allocation.percentual),
          desconto: Number(allocation.desconto),
          consumoMedio: Number(allocation.consumoMedio || 0),
          percentualRepasseDisponibilidade:
            allocation.gd2 === "REPASSAR" ? 100 : 0,
          repassarCustoDisponibilidadeGD1: allocation.gd1 === "REPASSAR",
          repassarCustoDisponibilidadeGD2: allocation.gd2 === "REPASSAR",
          repassarDiferencaFioBGD2: allocation.fioB === "REPASSAR",
          faturaSomenteAndrade: allocation.formatoFatura === "SOMENTE_ANDRADE",
          calcularAutomaticamente: false,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(
      response.ok
        ? "Configurações da UC atualizadas."
        : (data.message ?? "Não foi possível editar a UC."),
    );
    if (response.ok) {
      setEditOpen(false);
      onChanged();
    }
  }
  const unitFields = [
    ["Titular", unit.titular],
    ["Distribuidora", unit.distribuidora],
    ["Modalidade", unit.modalidade],
    ["Desconto", unit.desconto_percentual ?? unit.desconto],
    ["Rateio", unit.percentual_rateio ?? unit.percentual],
    ["Status", formatPortalValue("status", unit.status)],
  ];
  const detectedGd = String(
    latestInvoice?.tipo_gd ?? latestInvoice?.tipoGd ?? unit.tipo_gd ?? "",
  ).toUpperCase();
  const usesGd1 = !detectedGd || detectedGd === "GD1" || detectedGd === "MISTA";
  const usesGd2 = !detectedGd || detectedGd === "GD2" || detectedGd === "MISTA";
  const detectedGdLabel =
    detectedGd === "GD1"
      ? "GD I"
      : detectedGd === "GD2"
        ? "GD II"
        : detectedGd === "MISTA"
          ? "GD I + GD II (mista)"
          : "Aguardando a primeira fatura";
  return (
    <article className={`unit-tool-card ${expanded ? "expanded" : ""}`}>
      <button
        className="unit-summary"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <small>UNIDADE CONSUMIDORA</small>
          <strong>{String(unit.numero ?? unit.uc ?? "Sem número")}</strong>
          <em>{String(unit.titular ?? unit.distribuidora ?? "")}</em>
        </span>
        <b>{expanded ? "Fechar detalhes ↑" : "Abrir UC →"}</b>
      </button>
      {expanded ? (
        <>
          <div className="unit-detail-grid">
            {unitFields
              .filter(
                ([, value]) =>
                  value !== undefined && value !== null && value !== "",
              )
              .map(([label, value]) => (
                <div key={String(label)}>
                  <small>{String(label)}</small>
                  <strong>{String(value)}</strong>
                </div>
              ))}
          </div>
          <div className="unit-service-status">
            <div>
              <small>RECEBIMENTO DE CONTAS</small>
              <strong>{receipt?.ativo ? "Ativo" : "Não ativado"}</strong>
              {receipt?.endereco ? (
                <code>{String(receipt.endereco)}</code>
              ) : null}
            </div>
            <div>
              <small>CONTAS CONECTADAS</small>
              <strong>
                {connections.length
                  ? connections
                      .map(
                        (item) =>
                          `${String(item.provedor)} · ${String(item.status)}`,
                      )
                      .join(" | ")
                  : "Nenhuma conexão"}
              </strong>
            </div>
          </div>
          {receipt?.ativo && receipt.endereco ? (
            <section className="email-setup-card">
              <div className="email-setup-heading">
                <span className="email-setup-icon">✉</span>
                <div>
                  <small>RECEBIMENTO AUTOMÁTICO ATIVO</small>
                  <strong>Conecte o e-mail que recebe suas contas</strong>
                  <p>O sistema encaminhará somente contas da concessionária com PDF para o endereço exclusivo desta UC.</p>
                </div>
              </div>
              <code>{String(receipt.endereco)}</code>
              <ol>
                <li>Escolha Gmail ou Outlook abaixo.</li>
                <li>Autorize a conta de e-mail no seu provedor.</li>
                <li>As próximas contas com PDF serão encaminhadas para conferência automaticamente.</li>
              </ol>
              <div className="email-provider-actions">
                <button disabled={busy} onClick={() => void connectEmail("GMAIL")}>Conectar Gmail</button>
                <button disabled={busy} onClick={() => void connectEmail("OUTLOOK")}>Conectar Outlook</button>
              </div>
              <p className="email-privacy-note">Se preferir configurar manualmente, copie o endereço acima e crie uma regra para mensagens de fatura@cemig que contenham PDF.</p>
            </section>
          ) : null}
          {editOpen ? (
            <form className="unit-edit-form" onSubmit={saveAllocation}>
              <div>
                <label>
                  Usina
                  <select
                    required
                    value={allocation.usinaId}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        usinaId: event.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {plants.map((plant) => (
                      <option key={String(plant.id)} value={String(plant.id)}>
                        {String(plant.nome ?? plant.numero_instalacao)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Modalidade
                  <select
                    value={allocation.modalidade}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        modalidade: event.target.value,
                      })
                    }
                  >
                    <option value="COMPENSACAO">Compensação</option>
                    <option value="INJECAO">Injeção</option>
                  </select>
                </label>
                <label>
                  Rateio (%)
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={allocation.percentual}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        percentual: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Desconto (%)
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={allocation.desconto}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        desconto: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Consumo médio (kWh)
                  <input
                    type="number"
                    min="0"
                    value={allocation.consumoMedio}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        consumoMedio: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Formato da cobrança
                  <select
                    value={allocation.formatoFatura}
                    onChange={(event) =>
                      setAllocation({
                        ...allocation,
                        formatoFatura: event.target.value,
                      })
                    }
                  >
                    <option value="UNIFICADA">
                      Fatura unificada (CEMIG + Andrade)
                    </option>
                    <option value="SOMENTE_ANDRADE">
                      Somente Andrade Energy
                    </option>
                  </select>
                </label>
                {allocation.formatoFatura === "UNIFICADA" ? <div className="detected-gd-info">
                  <small>MODALIDADE IDENTIFICADA AUTOMATICAMENTE</small>
                  <strong>{detectedGdLabel}</strong>
                  <span>A leitura é feita pela última fatura importada e não precisa ser selecionada manualmente.</span>
                </div> : null}
                {allocation.formatoFatura === "UNIFICADA" && usesGd1 ? <label>
                  GD I · custo de disponibilidade recalculado
                  <select
                    value={allocation.gd1}
                    onChange={(event) =>
                      setAllocation({ ...allocation, gd1: event.target.value })
                    }
                  >
                    <option value="REPASSAR">Repassar ao cliente</option>
                    <option value="ABSORVER">Absorver pela Andrade</option>
                  </select>
                </label> : null}
                {allocation.formatoFatura === "UNIFICADA" && usesGd2 ? <label>
                  GD II · custo de disponibilidade recalculado
                  <select
                    value={allocation.gd2}
                    onChange={(event) =>
                      setAllocation({ ...allocation, gd2: event.target.value })
                    }
                  >
                    <option value="REPASSAR">Repassar ao cliente</option>
                    <option value="ABSORVER">Absorver pela Andrade</option>
                  </select>
                </label> : null}
                {allocation.formatoFatura === "UNIFICADA" && usesGd2 ? <label>
                  GD II · diferença do Fio B
                  <select
                    value={allocation.fioB}
                    onChange={(event) =>
                      setAllocation({ ...allocation, fioB: event.target.value })
                    }
                  >
                    <option value="REPASSAR">Repassar ao cliente</option>
                    <option value="ABSORVER">Absorver pela Andrade</option>
                  </select>
                </label> : null}
              </div>
              {allocation.formatoFatura === "UNIFICADA" ? <RealDiscountInfoWeb
                desconto={allocation.desconto}
                tipoGd={detectedGd}
                modalidadeFaturamento={allocation.modalidade}
                dadosFatura={latestInvoice}
                gd1={allocation.gd1}
                gd2={allocation.gd2}
                fioB={allocation.fioB}
              /> : null}
              <footer>
                <button type="button" onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
                <button disabled={busy}>Salvar alterações</button>
              </footer>
            </form>
          ) : null}
          <details className="unit-action-menu">
            <summary>
              Ações da UC <span>⌄</span>
            </summary>
            <div className="unit-actions">
              <button
                disabled={busy}
                onClick={() => void openAllocationEditor()}
              >
                Editar alocação e faturamento
              </button>
              {receipt?.ativo ? (
                <>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void request(
                        `/recebimento-faturas/unidades/${unit.id}/desativar`,
                      )
                    }
                  >
                    Desativar recebimento
                  </button>
                </>
              ) : (
                <button
                  disabled={busy}
                  onClick={() =>
                    void request(
                      `/recebimento-faturas/unidades/${unit.id}/ativar`,
                      "POST",
                      undefined,
                      undefined,
                      false,
                    )
                  }
                >
                  Ativar recebimento por e-mail
                </button>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  void request(
                    `/contratos/unidade/${unit.id}/gerar-documento`,
                    "POST",
                    "{}",
                    { "Content-Type": "application/json" },
                  )
                }
              >
                Gerar contrato
              </button>
              <label className="tool-button file-tool">
                Enviar contrato assinado
                <input
                  accept="application/pdf"
                  type="file"
                  onChange={(event) =>
                    void uploadContract(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <button
                className="danger-tool"
                disabled={busy}
                onClick={() =>
                  window.confirm("Excluir esta unidade consumidora?") &&
                  void request(`/clientes/unidade/${unit.id}`, "DELETE")
                }
              >
                Excluir unidade
              </button>
            </div>
          </details>
          {message && <small className="unit-message">{message}</small>}
        </>
      ) : null}
    </article>
  );
}

function RecordDetails({
  section,
  record,
  token,
  isGenerator,
  onClose,
}: {
  section: string;
  record: WebRecord;
  token: string;
  isGenerator: boolean;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<WebRecord>(record);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [related, setRelated] = useState<{
    units: WebRecord[];
    invoices: WebRecord[];
  }>({ units: [], invoices: [] });
  const [relatedKey, setRelatedKey] = useState(0);
  useEffect(() => {
    const id = String(record.id ?? "");
    if (!id) return;
    const endpoints: Record<string, string> = {
      Usinas: `/usinas/${id}/dashboard`,
      Clientes: `/clientes/${id}`,
      "Unidades consumidoras": `/clientes/unidade/${id}`,
      Faturas: `/faturas/${id}`,
      Operação: `/fechamentos/${id}`,
      "Minha unidade": `/clientes/unidade/${id}`,
      Contratos: `/contratos/unidade/${id}`,
    };
    const endpoint = endpoints[section];
    if (!endpoint) return;
    setLoading(true);
    void fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) =>
        response.ok ? response.json() : Promise.reject(),
      )
      .then((data) => setDetails(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    if (section === "Clientes")
      void Promise.all([
        fetch(`${API_URL}/clientes/${id}/unidades`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/faturas?clienteId=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
        .then(async ([unitsResponse, invoicesResponse]) => ({
          units: unitsResponse.ok ? await unitsResponse.json() : [],
          invoices: invoicesResponse.ok ? await invoicesResponse.json() : [],
        }))
        .then((data) =>
          setRelated({
            units: Array.isArray(data.units) ? data.units : [],
            invoices: Array.isArray(data.invoices) ? data.invoices : [],
          }),
        )
        .catch(() => undefined);
  }, [record, section, token, relatedKey]);
  if (section === "Unidades consumidoras")
    return (
      <section className="section-workspace detail-page">
        <button className="detail-back" onClick={onClose}>
          ← Voltar para unidades consumidoras
        </button>
        <div className="detail-title">
          <div>
            <span className="section-label">GESTÃO DA UC</span>
            <h2>
              {String(details.numero ?? details.uc ?? "Unidade consumidora")}
            </h2>
          </div>
        </div>
        {loading ? (
          <div className="detail-loading">
            Carregando informações completas...
          </div>
        ) : (
          <UnitTools
            unit={details}
            token={token}
            onChanged={() => setRelatedKey((value) => value + 1)}
          />
        )}
      </section>
    );
  const source = (
    details.usina && typeof details.usina === "object"
      ? { ...details, ...(details.usina as WebRecord) }
      : details
  ) as WebRecord;
  const preferred = [
    "nome",
    "titular",
    "numero_instalacao",
    "numero",
    "referencia",
    "competencia",
    "email",
    "telefone",
    "cpf",
    "distribuidora",
    "endereco",
    "potencia_kwp",
    "energiaGerada",
    "energia_gerada",
    "energiaDisponivel",
    "ocupacao",
    "receitaPrevista",
    "receitaRealizada",
    "valor_total_unificado",
    "valor_total",
    "vencimento",
    "status",
  ];
  const labels: Record<string, string> = {
    nome: "Nome",
    titular: "Titular",
    numero_instalacao: "Instalação",
    numero: "Número da UC",
    referencia: "Referência",
    competencia: "Competência",
    email: "E-mail",
    telefone: "Telefone",
    cpf: "CPF/CNPJ",
    distribuidora: "Distribuidora",
    endereco: "Endereço",
    potencia_kwp: "Potência (kWp)",
    energiaGerada: "Energia gerada",
    energia_gerada: "Energia gerada",
    energiaDisponivel: "Energia disponível",
    ocupacao: "Ocupação (%)",
    receitaPrevista: "Receita prevista",
    receitaRealizada: "Receita realizada",
    valor_total_unificado: "Valor total",
    valor_total: "Valor total",
    vencimento: "Vencimento",
    status: "Status",
  };
  const fields = preferred.filter(
    (key, index) =>
      source[key] !== undefined &&
      source[key] !== null &&
      preferred.indexOf(key) === index &&
      !(key === "energia_gerada" && source.energiaGerada !== undefined) &&
      !(key === "valor_total" && source.valor_total_unificado !== undefined),
  );
  const documentLinks = [
    [
      "Fatura Andrade",
      source.pdf_unificada_url ??
        source.pdf_usina_url ??
        source.pdf_url ??
        source.pdf_andrade_url ??
        source.documento_url,
    ],
    [
      "Conta da concessionária",
      source.pdf_cemig_url ?? source.conta_luz_url ?? source.arquivo_url,
    ],
    ["Boleto", source.pdf_boleto_url],
    ["Contrato", source.contrato_url ?? source.documento_contrato_url],
    ["Contrato assinado", source.contrato_assinado_url],
  ].filter((item) => typeof item[1] === "string" && item[1]);
  async function postAction(endpoint: string, success: string) {
    setWorking(true);
    setMessage("");
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? success
        : (data.message ?? "Não foi possível concluir a ação."),
    );
    if (response.ok && section === "Faturas" && source.id) {
      const refreshed = await fetch(`${API_URL}/faturas/${source.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.ok) {
        const updated = await refreshed.json();
        setDetails(updated);
        setWorking(false);
        return updated as WebRecord;
      }
    }
    setWorking(false);
    return null;
  }
  async function copyPix() {
    const code = String(source.codigo_pix ?? "");
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setMessage("Código PIX copiado.");
  }
  async function addUnit() {
    const numero = window.prompt("Número da nova unidade consumidora:");
    if (!numero || !source.id) return;
    const cpfTitular =
      window.prompt("CPF do titular da unidade (somente números):") ?? "";
    setWorking(true);
    const response = await fetch(`${API_URL}/clientes/${source.id}/unidades`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numero, cpfTitular }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Unidade consumidora adicionada."
        : (data.message ?? "Não foi possível adicionar a unidade."),
    );
    setWorking(false);
  }
  async function importProduction(file: File | null) {
    if (!file || !source.id) return;
    setWorking(true);
    const body = new FormData();
    body.append("arquivo", file);
    const response = await fetch(
      `${API_URL}/usinas/${source.id}/importar-fatura`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body },
    );
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Produção importada e processada."
        : (data.message ?? "Não foi possível importar a conta."),
    );
    setWorking(false);
  }
  async function activateAutomaticProduction() {
    const generatorUnit = (
      details.unidadeGeradora && typeof details.unidadeGeradora === "object"
        ? details.unidadeGeradora
        : {}
    ) as WebRecord;
    const unitId = String(generatorUnit.id ?? source.unidade_geradora_id ?? "");
    if (!unitId) {
      setMessage(
        "Unidade geradora não localizada. Confirme o número da instalação nos dados da usina.",
      );
      return;
    }
    setWorking(true);
    const response = await fetch(
      `${API_URL}/recebimento-faturas/unidades/${unitId}/ativar`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? `Importação automática ativada. Encaminhe as contas da usina para ${data.endereco ?? "o endereço exclusivo gerado"}.`
        : (data.message ?? "Não foi possível ativar a importação automática."),
    );
    setWorking(false);
  }
  async function registerPayment() {
    if (!source.id) return;
    const method = window.prompt("Forma de pagamento:", "PIX") ?? "PIX";
    setWorking(true);
    const response = await fetch(`${API_URL}/faturas/${source.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "PAGO",
        metodo_pagamento: method,
        data_pagamento: new Date().toISOString(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Pagamento registrado com sucesso."
        : (data.message ?? "Não foi possível registrar o pagamento."),
    );
    setWorking(false);
  }
  async function allocateUnit() {
    if (!source.id) return;
    const clienteId = window.prompt("ID do cliente que receberá a energia:");
    const numero = window.prompt("Número da unidade consumidora:");
    if (!clienteId || !numero) return;
    const percentual = Number(
      window.prompt("Percentual de rateio:", "10") ?? 0,
    );
    const desconto = Number(window.prompt("Desconto percentual:", "20") ?? 0);
    setWorking(true);
    const response = await fetch(
      `${API_URL}/usinas/${source.id}/alocar-unidade`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId,
          numero,
          percentual,
          desconto,
          modalidade: "COMPENSACAO",
          calcularAutomaticamente: false,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Unidade alocada à usina."
        : (data.message ?? "Não foi possível alocar a unidade."),
    );
    setWorking(false);
  }
  return (
    <section className="section-workspace detail-page">
      <button className="detail-back" onClick={onClose}>
        ← Voltar para {section.toLowerCase()}
      </button>
      <div className="detail-title">
        <div>
          <span className="section-label">DETALHES</span>
          <h2>
            {String(
              source.nome ??
                source.titular ??
                source.referencia ??
                source.competencia ??
                section,
            )}
          </h2>
        </div>
        <span className="table-status">{String(source.status ?? "ATIVO")}</span>
      </div>
      {loading ? (
        <div className="detail-loading">
          Carregando informações completas...
        </div>
      ) : (
        <div className="detail-fields">
          {fields.map((key) => (
            <div key={key}>
              <small>{labels[key] ?? key}</small>
              <strong>{String(source[key])}</strong>
            </div>
          ))}
        </div>
      )}
      {isGenerator ? (
        <RecordEditForm
          section={section}
          record={source}
          token={token}
          onSaved={(data) => setDetails(data)}
        />
      ) : null}
      <div className="detail-tools">
        <h3>Ferramentas</h3>
        <div>
          {documentLinks.map(([label, url]) => (
            <a
              className="tool-button"
              href={String(url)}
              target="_blank"
              rel="noreferrer"
              key={String(label)}
            >
              ↓ Baixar {String(label)}
            </a>
          ))}
          {section === "Faturas" && source.id && isGenerator ? (
            <>
              <button
                disabled={working}
                onClick={() =>
                  void postAction(
                    `/faturas/${source.id}/regenerar-documentos`,
                    "Documentos regenerados com sucesso.",
                  )
                }
              >
                Regenerar documentos
              </button>
              {String(source.status ?? "").toUpperCase() === "RASCUNHO" ? (
                <button
                  disabled={working}
                  onClick={() =>
                    void postAction(
                      `/faturas/${source.id}/confirmar`,
                      "Fatura confirmada com sucesso.",
                    )
                  }
                >
                  Confirmar fatura
                </button>
              ) : null}
              {String(source.status ?? "").toUpperCase() !== "RASCUNHO" ? (
                <button
                  disabled={working}
                  onClick={() =>
                    void postAction(
                      `/asaas/cobrancas/${source.id}`,
                      "Boleto e PIX gerados com sucesso.",
                    )
                  }
                >
                  {source.pdf_boleto_url || source.codigo_pix
                    ? "Atualizar boleto, PIX e fatura"
                    : "Gerar boleto, PIX e fatura"}
                </button>
              ) : null}
              {source.codigo_pix ? (
                <button disabled={working} onClick={() => void copyPix()}>
                  Copiar PIX
                </button>
              ) : null}
              {String(source.status ?? "").toUpperCase() !== "PAGO" ? (
                <button
                  disabled={working}
                  onClick={() => void registerPayment()}
                >
                  Registrar pagamento
                </button>
              ) : null}
            </>
          ) : null}
          {section === "Clientes" ? (
            <button disabled={working} onClick={() => void addUnit()}>
              + Adicionar unidade
            </button>
          ) : null}
          {section === "Usinas" ? (
            <>
              <button
                disabled={working}
                onClick={() => void activateAutomaticProduction()}
              >
                Ativar importação automática por e-mail
              </button>
              <label className="tool-button file-tool">
                Importar produção manualmente
                <input
                  accept="application/pdf"
                  type="file"
                  onChange={(event) =>
                    void importProduction(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <button disabled={working} onClick={() => void allocateUnit()}>
                Alocar unidade
              </button>
            </>
          ) : null}
          {section === "Contratos" &&
          source.id &&
          !/aceito|assinado/i.test(String(source.status ?? "")) ? (
            <button
              disabled={working}
              onClick={() =>
                void postAction(
                  `/contratos/${source.id}/aceite-eletronico`,
                  "Contrato aceito eletronicamente.",
                )
              }
            >
              Aceitar contrato
            </button>
          ) : null}
        </div>
        {!documentLinks.length &&
        !["Faturas", "Clientes", "Usinas", "Contratos"].includes(section) ? (
          <p>Nenhuma ação adicional disponível para este registro.</p>
        ) : null}
        {message && <div className="invite-message">{message}</div>}
      </div>
      {section === "Clientes" ? (
        <div className="related-section">
          <div>
            <h3>Unidades consumidoras</h3>
            <span>
              {related.units.length} vinculada
              {related.units.length === 1 ? "" : "s"}
            </span>
          </div>
          {related.units.map((unit) => (
            <UnitTools
              key={String(unit.id)}
              unit={unit}
              token={token}
              onChanged={() => setRelatedKey((value) => value + 1)}
            />
          ))}
          {related.invoices.length ? (
            <>
              <div className="related-heading">
                <h3>Histórico de faturas</h3>
                <span>
                  {related.invoices.length} documento
                  {related.invoices.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="related-invoices">
                {related.invoices.map((invoice) => (
                  <article key={String(invoice.id)}>
                    <strong>{String(invoice.referencia ?? "Fatura")}</strong>
                    <span>
                      {Number(
                        invoice.valor_total_unificado ??
                          invoice.valor_total ??
                          0,
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                    <small>{String(invoice.status ?? "")}</small>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="detail-footer">
        <span>Dados sincronizados com o aplicativo</span>
        <button onClick={onClose}>Voltar</button>
      </div>
    </section>
  );
}

function ActionDialog({
  section,
  token,
  onClose,
  onSuccess,
}: {
  section: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const configs: Record<
    string,
    { endpoint: string; fields: Array<[string, string, string]>; title: string }
  > = {
    Usinas: {
      endpoint: "/usinas",
      title: "Cadastrar nova usina",
      fields: [
        ["nome", "Nome da usina", "text"],
        ["numero_instalacao", "Número da instalação", "text"],
        ["potencia_kwp", "Potência (kWp)", "number"],
        ["titular_nome", "Titular", "text"],
        ["endereco", "Endereço", "text"],
      ],
    },
    Clientes: {
      endpoint: "/clientes",
      title: "Cadastrar novo cliente",
      fields: [
        ["nome", "Nome", "text"],
        ["cpf", "CPF/CNPJ", "text"],
        ["email", "E-mail", "email"],
        ["telefone", "Telefone", "text"],
        ["uc", "Unidade consumidora", "text"],
      ],
    },
    Financeiro: {
      endpoint: "/fechamentos",
      title: "Novo fechamento",
      fields: [
        ["usina_id", "ID da usina", "text"],
        ["competencia", "Competência (AAAA-MM-DD)", "date"],
        ["energia_gerada", "Energia gerada (kWh)", "number"],
        ["receita_prevista", "Receita prevista", "number"],
      ],
    },
  };
  const config = configs[section];
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let response: Response;
      if (section === "Faturas") {
        if (!file) throw new Error("Selecione uma conta de energia em PDF.");
        const body = new FormData();
        body.append("arquivo", file);
        response = await fetch(`${API_URL}/faturas/importar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
      } else {
        const numeric = new Set([
          "potencia_kwp",
          "energia_gerada",
          "receita_prevista",
        ]);
        const payload = Object.fromEntries(
          Object.entries(form).map(([key, value]) => [
            key,
            numeric.has(key) ? Number(value) : value || null,
          ]),
        );
        if (section === "Usinas")
          Object.assign(payload, {
            distribuidora: "CEMIG",
            modalidade: "INJECAO",
            status: "ATIVA",
          });
        if (section === "Clientes") Object.assign(payload, { status: "ATIVO" });
        response = await fetch(`${API_URL}${config.endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message ?? "Não foi possível salvar.");
      onSuccess();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="operation-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <span className="section-label">NOVA OPERAÇÃO</span>
        <h2>
          {section === "Faturas"
            ? "Importar conta de energia"
            : (config?.title ?? "Nova operação")}
        </h2>
        <form onSubmit={submit}>
          {section === "Faturas" ? (
            <label>
              Arquivo PDF
              <input
                accept="application/pdf"
                required
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            config?.fields.map(([key, label, type]) => (
              <label key={key}>
                {label}
                <input
                  required={
                    key === "nome" ||
                    key === "numero_instalacao" ||
                    key === "usina_id" ||
                    key === "competencia"
                  }
                  type={type}
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))
          )}
          {error && <div className="error-message">{error}</div>}
          <button className="submit-operation" disabled={saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MySubscriptionPanel({ token }: { token: string }) {
  const money = (value: unknown) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [opening, setOpening] = useState(false);
  const load = useCallback(async () => { setLoading(true); const response = await fetch(`${API_URL}/comercial/minha-assinatura`, { headers: { Authorization: `Bearer ${token}` } }); const payload = await response.json().catch(() => ({})); setLoading(false); response.ok ? setData(payload) : setMessage(payload.message ?? "Não foi possível consultar a assinatura."); }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function checkout() { setOpening(true); setMessage(""); const popup = window.open("", "_blank"); const response = await fetch(`${API_URL}/comercial/minha-assinatura/checkout`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ formasPagamento: ["CREDIT_CARD", "PIX"] }) }); const payload = await response.json().catch(() => ({})); setOpening(false); if (response.ok && payload.url) { if (popup) popup.location.href = payload.url; else window.location.href = payload.url; } else { popup?.close(); setMessage(payload.message ?? "Não foi possível abrir o pagamento seguro."); } }
  if (loading) return <div className="data-state">Carregando sua assinatura...</div>;
  const item=data?.assinatura, plan=item?.plano, charges=[...(item?.cobrancas??[])].sort((a:any,b:any)=>String(b.vencimento).localeCompare(String(a.vencimento))); const date=(value:any)=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR"):"Não definida";
  if(!item) return <section className="subscription-empty"><b>◇</b><h2>Assinatura ainda não vinculada</h2><p>A administração precisa vincular um plano a esta conta geradora.</p>{message?<div className="error-message">{message}</div>:null}</section>;
  return <div className="subscription-page"><section className="subscription-hero"><div><small>MINHA ASSINATURA</small><h2>{plan?.nome??"Andrade Energy"}</h2><p>{plan?.descricao??"Licença de uso da plataforma"}</p></div><span>{String(item.status).replace("ATIVA","ATIVA").replace("INADIMPLENTE","PAGAMENTO PENDENTE")}</span></section><div className="subscription-metrics"><article><small>VALOR</small><strong>{money(item.valor_contratado)}</strong><span>{item.ciclo==="ANUAL"?"por ano":"por mês"}</span></article><article><small>VALIDADE</small><strong>{date(item.proximo_vencimento)}</strong><span>próximo vencimento</span></article><article><small>FORMA ATUAL</small><strong>{String(item.forma_pagamento??"Não definida").replace("CREDIT_CARD","Cartão").replace("BOLETO","Boleto")}</strong><span>ciclo {String(item.ciclo).toLowerCase()}</span></article></div><button className="subscription-checkout" disabled={opening} onClick={()=>void checkout()}><b>▣</b><span><strong>{opening?"Abrindo ambiente seguro...":"Ativar pagamento recorrente"}</strong><small>Escolha cartão ou Pix no checkout protegido do Asaas</small></span><em>↗</em></button>{message?<div className="error-message">{message}</div>:null}<div className="subscription-columns"><section className="section-workspace"><span className="section-label">RECURSOS DO PLANO</span>{(plan?.recursos??[]).map((resource:string)=><p className="subscription-resource" key={resource}>✓ {resource}</p>)}</section><section className="section-workspace"><span className="section-label">COBRANÇAS</span>{charges.length?charges.map((charge:any)=><article className="subscription-charge" key={charge.id}><span><strong>{charge.competencia??"Mensalidade"}</strong><small>Vence em {date(charge.vencimento)}</small></span><span><strong>{money(charge.valor)}</strong><small>{charge.status==="PAGA"?"Paga":charge.status==="VENCIDA"?"Vencida":"Pendente"}</small></span></article>):<p>Nenhuma cobrança registrada.</p>}</section></div></div>;
}

function PortalHome({
  session,
  type,
  onLogout,
  workspace,
  onChangeWorkspace,
}: {
  session: PortalSession;
  type: AccessType;
  onLogout: () => void;
  workspace?: AdminWorkspace;
  onChangeWorkspace: (workspace: AdminWorkspace | null) => void;
}) {
  const name =
    session.usuario?.nome ?? (type === "GERADOR" ? "Gerador" : "Cliente");
  const [dashboard, setDashboard] = useState<Record<
    string,
    number | string
  > | null>(null);
  const [activeSection, setActiveSection] = useState(workspace === "COMERCIAL" ? "Gestão comercial" : "Visão geral");
  const [sectionData, setSectionData] = useState<WebRecord[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WebRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [walletHome, setWalletHome] = useState<WalletSummary | null>(null);
  const [walletNotice, setWalletNotice] = useState(false);
  const [company, setCompany] = useState<PortalCompany>(DEFAULT_COMPANY);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isCommercialWorkspace = type === "GERADOR" && session.usuario?.perfil === "ADMIN" && workspace === "COMERCIAL";

  useEffect(() => {
    if (!session.token) return;
    let active = true;
    fetch(`${API_URL}/empresas/atual`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!active) return;
        setCompany(data.identidade_personalizada ? { ...DEFAULT_COMPANY, ...data } : DEFAULT_COMPANY);
      })
      .catch(() => { if (active) setCompany(DEFAULT_COMPANY); });
    return () => { active = false; };
  }, [session.token]);

  useEffect(() => {
    setActiveSection((current) => {
      if (isCommercialWorkspace && !["Gestão comercial", "Empresas", "Geradores", "Aplicativos", "Perfil", "Configurações"].includes(current)) return "Gestão comercial";
      if (!isCommercialWorkspace && ["Gestão comercial", "Geradores"].includes(current)) return "Visão geral";
      return current;
    });
  }, [isCommercialWorkspace]);

  useEffect(() => {
    if (!session.token) return;
    const headers = { Authorization: `Bearer ${session.token}` };
    if (type === "CONSUMIDOR") {
      const clienteId = session.usuario?.cliente_id ?? session.usuario?.id;
      if (!clienteId) return;
      void fetch(
        `${API_URL}/dashboard/cliente?clienteId=${encodeURIComponent(clienteId)}`,
        { headers },
      )
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => setDashboard(data))
        .catch(() => undefined);
      return;
    }
    void fetch(`${API_URL}/usinas`, { headers })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((usinas) => {
        const id = Array.isArray(usinas)
          ? usinas[0]?.id
          : usinas?.data?.[0]?.id;
        return id
          ? fetch(`${API_URL}/usinas/${id}/dashboard`, { headers })
          : null;
      })
      .then((response) => (response?.ok ? response.json() : null))
      .then((data) => data && setDashboard(data))
      .catch(() => undefined);
  }, [session.token, type]);

  useEffect(() => {
    if (type !== "GERADOR" || !session.token) return;
    const loadWallet = async () => {
      const response = await fetch(`${API_URL}/carteira`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!response.ok) return;
      const wallet = (await response.json()) as WalletSummary;
      setWalletHome(wallet);
      const storageKey = `andrade_wallet_received:${session.usuario?.id ?? "gerador"}`;
      const previous = localStorage.getItem(storageKey);
      localStorage.setItem(storageKey, String(wallet.totalRecebido));
      if (previous !== null && wallet.totalRecebido > Number(previous))
        setWalletNotice(true);
    };
    void loadWallet();
    const timer = window.setInterval(() => void loadWallet(), 60_000);
    return () => window.clearInterval(timer);
  }, [session.token, session.usuario?.id, type]);

  function openWallet() {
    setWalletNotice(false);
    setSelectedRecord(null);
    setActiveSection("Carteira");
  }

  useEffect(() => {
    if (activeSection === "Visão geral" || !session.token) return;
    const clientId = session.usuario?.cliente_id ?? session.usuario?.id ?? "";
    const endpoints: Record<string, string> = {
      Usinas: "/usinas",
      Clientes: "/clientes",
      "Unidades consumidoras": "/clientes/unidades",
      Faturas: "/faturas",
      Contratos: "/clientes/unidades",
      Financeiro: "/faturas",
      Operação: "/fechamentos",
      "Contas de luz": "/faturas?categoria=concessionaria",
      "Minha unidade": "/clientes/minhas-unidades",
      Economia: `/dashboard/cliente?clienteId=${encodeURIComponent(clientId)}`,
    };
    const endpoint = endpoints[activeSection];
    if (!endpoint) return;
    setSectionLoading(true);
    setSectionError("");
    void fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            payload?.message ?? "Não foi possível carregar os dados.",
          );
        const records = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.items)
              ? payload.items
              : [payload];
        setSectionData(records);
      })
      .catch((reason) => {
        setSectionData([]);
        setSectionError(
          reason instanceof Error
            ? reason.message
            : "Falha ao carregar os dados.",
        );
      })
      .finally(() => setSectionLoading(false));
  }, [activeSection, session.token, refreshKey]);

  const energy = Number(dashboard?.energiaGerada ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
  const clients = Number(dashboard?.clientes ?? 0).toLocaleString("pt-BR");
  const revenue = Number(dashboard?.receitaPrevista ?? 0).toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  );
  const available = Number(dashboard?.energiaDisponivel ?? 0);
  const occupancy = Math.min(
    100,
    Math.max(0, Number(dashboard?.ocupacao ?? 0)),
  );
  const menuGroups =
    type === "GERADOR"
      ? isCommercialWorkspace
        ? [
            { label: "Gestão comercial", items: ["Gestão comercial", "Empresas", "Geradores", "Aplicativos"] },
            { label: "Conta", items: ["Perfil", "Configurações"] },
            { label: "Ambiente", items: ["Alternar ambiente"] },
          ]
      : [
          { label: "Painel", items: ["Visão geral"] },
          {
            label: "Gestão de energia",
            items: ["Clientes", "Unidades consumidoras", "Usinas", "Operação"],
          },
          {
            label: "Documentos e cobrança",
            items: [
              "Faturas",
              "Contas de luz",
              "Contratos",
              "Financeiro",
              "Carteira",
            ],
          },
          ...(session.usuario?.perfil === "ADMIN"
            ? [{ label: "Administração", items: workspace === "COMERCIAL" ? ["Gestão comercial", "Geradores", "Alternar ambiente"] : ["Alternar ambiente"] }]
            : []),
          { label: "Conta", items: ["Minha assinatura", "Aplicativos", "Perfil", "Configurações"] },
        ]
        : [
          { label: "Painel", items: ["Visão geral", "Economia"] },
          {
            label: "Minha energia",
            items: ["Minha unidade", "Faturas", "Contas de luz", "Contratos"],
          },
          { label: "Conta", items: ["Aplicativos", "Perfil", "Configurações"] },
        ];
  const chart = [42, 58, 49, 68, 61, 79, 74, 88, 82, 95, 89, 100];
  const columns: Record<string, Array<[string, string]>> = {
    Usinas: [
      ["nome", "Usina"],
      ["numero_instalacao", "Instalação"],
      ["distribuidora", "Distribuidora"],
      ["status", "Status"],
    ],
    Clientes: [
      ["nome", "Cliente"],
      ["cpf", "CPF/CNPJ"],
      ["email", "E-mail"],
      ["status", "Status"],
    ],
    "Unidades consumidoras": [
      ["numero", "Número da UC"],
      ["titular", "Titular"],
      ["distribuidora", "Distribuidora"],
      ["status", "Status"],
    ],
    Faturas: [
      ["referencia", "Referência"],
      ["valor_total_unificado", "Valor"],
      ["vencimento", "Vencimento"],
      ["status", "Status"],
    ],
    Contratos: [
      ["titular", "Unidade/Titular"],
      ["numero", "Número UC"],
      ["modalidade", "Modalidade"],
      ["status", "Status"],
    ],
    Financeiro: [
      ["competencia", "Competência"],
      ["receitaPrevista", "Previsto"],
      ["receitaRealizada", "Realizado"],
      ["status", "Status"],
    ],
    Operação: [
      ["competencia", "Competência"],
      ["energia_gerada", "Energia gerada"],
      ["ocupacao", "Ocupação (%)"],
      ["status", "Status"],
    ],
    "Contas de luz": [
      ["referencia", "Referência"],
      ["numero_instalacao", "Instalação"],
      ["valor_total", "Valor"],
      ["status", "Status"],
    ],
    "Minha unidade": [
      ["numero", "Número UC"],
      ["titular", "Titular"],
      ["distribuidora", "Distribuidora"],
      ["status", "Status"],
    ],
    Economia: [
      ["competencia", "Competência"],
      ["consumo", "Consumo"],
      ["economia", "Economia"],
      ["status", "Status"],
    ],
  };
  const formatCell = (field: string, value: unknown) => {
    return formatPortalValue(field, value);
  };
  const visibleData = sectionData.filter(
    (item) =>
      !searchQuery.trim() ||
      Object.values(item).some((value) =>
        String(value ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(searchQuery.trim().toLocaleLowerCase("pt-BR")),
      ),
  );
  const canCreate =
    type === "GERADOR" &&
    ["Usinas", "Clientes", "Faturas", "Financeiro"].includes(activeSection);
  async function deleteRecord(item: WebRecord) {
    if (
      !session.token ||
      !item.id ||
      !window.confirm("Confirma a exclusão deste registro?")
    )
      return;
    const endpoints: Record<string, string> = {
      Usinas: "/usinas",
      Clientes: "/clientes",
      Faturas: "/faturas",
    };
    const endpoint = endpoints[activeSection];
    if (!endpoint) return;
    const response = await fetch(`${API_URL}${endpoint}/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      window.alert(data.message ?? "Não foi possível excluir.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }
  async function inviteClient() {
    if (!session.token) return;
    const nome = window.prompt("Nome completo do consumidor:");
    const cpf = window.prompt("CPF do consumidor (somente números):");
    const email = window.prompt("E-mail que receberá o convite:");
    if (!nome || !cpf || !email) return;
    const response = await fetch(`${API_URL}/convites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nome, cpf: cpf.replace(/\D/g, ""), email }),
    });
    const data = await response.json().catch(() => ({}));
    window.alert(
      response.ok
        ? "Convite enviado ao consumidor."
        : (data.message ?? "Não foi possível enviar o convite."),
    );
  }
  return (
    <main className="portal-home" style={{ "--brand-primary": company.cor_primaria, "--brand-secondary": company.cor_secundaria } as CSSProperties}>
      <header className="portal-topbar">
        <button
          className="mobile-nav-button"
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileNavOpen ? "×" : "☰"}</span>
        </button>
        <div className="topbar-brand">
          {company.logo_url ? <img src={company.logo_url} alt="" aria-hidden="true" /> : <i>{company.nome.slice(0, 2).toUpperCase()}</i>}
          <span><strong>{company.nome}</strong><small>{isCommercialWorkspace ? "Gestão comercial" : type === "GERADOR" ? "Gestão de energia" : "Portal do consumidor"}</small></span>
        </div>
        <div>
          <button
            className="user-menu-button"
            onClick={() => {
              setSelectedRecord(null);
              setActiveSection("Perfil");
            }}
          >
            Olá, {name}
          </button>
          <button onClick={onLogout}>Sair</button>
        </div>
      </header>
      {mobileNavOpen ? <button className="mobile-nav-backdrop" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} /> : null}
      <div className="portal-layout">
        <aside className={`portal-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-brand">
            {company.logo_url ? <img src={company.logo_url} alt={`Logo ${company.nome}`} /> : <i>AE</i>}
            <span>
              <strong>{company.nome}</strong>
              <small>Portal de gestão</small>
            </span>
          </div>
          <nav>
            {menuGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <span>{group.label}</span>
                {group.items.map((item) => (
                  <button
                    onClick={() => {
                      if (item === "Alternar ambiente") { onChangeWorkspace(null); return; }
                      setSelectedRecord(null);
                      setActiveSection(item);
                      setSearchQuery("");
                      if (item === "Carteira") setWalletNotice(false);
                      setMobileNavOpen(false);
                    }}
                    className={activeSection === item ? "active" : ""}
                    key={item}
                  >
                    <b>{item.slice(0, 1)}</b>
                    <span>{item}</span>
                    {walletNotice && item === "Carteira" ? (
                      <em className="wallet-menu-badge">NOVO</em>
                    ) : null}
                    <i>›</i>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-help">
            <small>PRECISA DE AJUDA?</small>
            <strong>Fale com o suporte</strong>
            <a href={`mailto:${company.email_suporte || DEFAULT_COMPANY.email_suporte}`}>Entrar em contato →</a>
          </div>
        </aside>
        <section className="portal-dashboard">
          {activeSection === "Carteira" && session.token ? (
            <WalletPanel token={session.token} />
          ) : null}
          <div className="dashboard-heading">
            <div>
              <span className="section-label">
                PORTAL {type === "GERADOR" ? "DO GERADOR" : "DO CLIENTE"}
              </span>
              <h1>{activeSection}</h1>
              <p className="dashboard-lead">
                {activeSection === "Visão geral"
                  ? "Decisões mais claras com os dados da sua operação."
                  : `Gestão completa de ${activeSection.toLowerCase()} em um só lugar.`}
              </p>
            </div>
            {canCreate && !selectedRecord ? (
              <div className="heading-actions">
                {activeSection === "Clientes" ? (
                  <button
                    className="secondary-action"
                    onClick={() => void inviteClient()}
                  >
                    Convidar cliente
                  </button>
                ) : null}
                <button
                  className="primary-action"
                  onClick={() => setActionOpen(true)}
                >
                  {activeSection === "Faturas"
                    ? "+ Importar fatura"
                    : activeSection === "Usinas"
                      ? "+ Nova usina"
                      : activeSection === "Clientes"
                        ? "+ Novo cliente"
                        : "+ Novo fechamento"}
                </button>
              </div>
            ) : null}
          </div>
          {activeSection === "Visão geral" ? (
            type === "CONSUMIDOR" ? (
              <ClientOverview data={dashboard} onNavigate={setActiveSection} />
            ) : (
              <>
                {walletHome ? (
                  <button
                    className={`wallet-home-card ${walletNotice ? "has-notice" : ""}`}
                    onClick={openWallet}
                  >
                    <span className="wallet-home-icon">R$</span>
                    <span>
                      <small>SALDO EM CARTEIRA</small>
                      <strong>
                        {walletHome.saldoDisponivel.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>
                      <em>
                        {walletHome.transferenciaAutomatica
                          ? "Transferência automática ativa"
                          : "Transferência manual"}
                      </em>
                    </span>
                    <span className="wallet-home-side">
                      {walletNotice ? <b>Novo recebimento</b> : null}
                      <small>Total recebido</small>
                      <strong>
                        {walletHome.totalRecebido.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>
                      <i>Abrir carteira →</i>
                    </span>
                  </button>
                ) : null}
                <div className="dashboard-metrics top-metrics">
                  <article>
                    <small>Geração no mês</small>
                    <strong>{energy} kWh</strong>
                    <span className="metric-up">↑ 8,4% no período</span>
                  </article>
                  <article>
                    <small>Clientes ativos</small>
                    <strong>{clients}</strong>
                    <span>Carteira atual</span>
                  </article>
                  <article>
                    <small>Receita prevista</small>
                    <strong>{revenue}</strong>
                    <span className="metric-up">Dentro da projeção</span>
                  </article>
                  <article>
                    <small>Energia disponível</small>
                    <strong>
                      {available.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      kWh
                    </strong>
                    <span>Pronta para alocação</span>
                  </article>
                </div>
                <div className="analytics-grid">
                  <article className="chart-card">
                    <div className="card-heading">
                      <div>
                        <small>DESEMPENHO</small>
                        <h2>Geração de energia</h2>
                      </div>
                      <select aria-label="Período">
                        <option>Últimos 12 meses</option>
                        <option>Últimos 6 meses</option>
                      </select>
                    </div>
                    <div className="bar-chart">
                      {chart.map((value, index) => (
                        <div key={index}>
                          <span style={{ height: `${value}%` }} />
                          <small>
                            {
                              [
                                "Set",
                                "Out",
                                "Nov",
                                "Dez",
                                "Jan",
                                "Fev",
                                "Mar",
                                "Abr",
                                "Mai",
                                "Jun",
                                "Jul",
                                "Ago",
                              ][index]
                            }
                          </small>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="allocation-card">
                    <div className="card-heading">
                      <div>
                        <small>ALOCAÇÃO</small>
                        <h2>Uso da energia</h2>
                      </div>
                    </div>
                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(#0a9b57 0 ${occupancy}%, #e5eee9 ${occupancy}% 100%)`,
                      }}
                    >
                      <div>
                        <strong>
                          {occupancy.toLocaleString("pt-BR", {
                            maximumFractionDigits: 0,
                          })}
                          %
                        </strong>
                        <small>alocada</small>
                      </div>
                    </div>
                    <div className="allocation-legend">
                      <span>
                        <i className="allocated" />
                        Energia alocada
                      </span>
                      <span>
                        <i />
                        Disponível
                      </span>
                    </div>
                  </article>
                </div>
                <div className="smart-row">
                  <div>
                    <span className="smart-icon">✦</span>
                    <div>
                      <small>INSIGHT INTELIGENTE</small>
                      <strong>
                        {available > 0
                          ? `Você possui ${available.toLocaleString("pt-BR")} kWh disponíveis para novos clientes.`
                          : "Sua operação está com a energia bem distribuída."}
                      </strong>
                    </div>
                  </div>
                  <button onClick={() => setActiveSection("Financeiro")}>
                    Ver análise completa →
                  </button>
                </div>
              </>
            )
          ) : selectedRecord && session.token ? (
            <RecordDetails
              section={activeSection}
              record={selectedRecord}
              token={session.token}
              isGenerator={type === "GERADOR"}
              onClose={() => setSelectedRecord(null)}
            />
          ) : activeSection === "Empresas" && session.token ? (
            <CompaniesPanel token={session.token} />
          ) : activeSection === "Geradores" && session.token ? (
            <GeneratorInvitePanel token={session.token} />
          ) : activeSection === "Gestão comercial" && session.token ? (
            <><div className="commercial-quick-actions"><button onClick={() => setActiveSection("Geradores")}><b>G</b><span><strong>Contas geradoras</strong><small>Convites e acessos</small></span></button><button onClick={() => onChangeWorkspace("USINAS")}><b>☀</b><span><strong>Gestão de Usinas</strong><small>Alternar ambiente</small></span></button><button onClick={() => setActiveSection("Perfil")}><b>P</b><span><strong>Perfil administrativo</strong><small>Dados e segurança</small></span></button></div><CommercialManagementPanel token={session.token} /></>
          ) : activeSection === "Minha assinatura" && session.token ? (
            <MySubscriptionPanel token={session.token} />
          ) : activeSection === "Aplicativos" ? (
            <AppDownloadsPanel />
          ) : activeSection === "Perfil" && session.token ? (
            <><div className="profile-workspace-switch"><span><small>AMBIENTE ADMINISTRATIVO</small><strong>{workspace === "COMERCIAL" ? "Gestão Comercial" : "Gestão de Usinas"}</strong></span><button onClick={() => onChangeWorkspace(workspace === "COMERCIAL" ? "USINAS" : "COMERCIAL")}>Alternar para {workspace === "COMERCIAL" ? "Gestão de Usinas" : "Gestão Comercial"}</button><button onClick={() => onChangeWorkspace(null)}>Escolher ambiente</button></div><ProfilePanel token={session.token} fallback={session.usuario} /></>
          ) : activeSection === "Configurações" ? (
            <AccountSettingsPanel />
          ) : (
            <>
              <SectionInsights section={activeSection} records={visibleData} />
              <div className="section-workspace">
                <div className="data-toolbar">
                  <div>
                    <small>DADOS ATUALIZADOS</small>
                    <strong>
                      {visibleData.length} registro
                      {visibleData.length === 1 ? "" : "s"}
                    </strong>
                  </div>
                  <div className="toolbar-actions">
                    <input
                      aria-label="Buscar"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={`Buscar em ${activeSection.toLowerCase()}...`}
                    />
                    <button onClick={() => setRefreshKey((value) => value + 1)}>
                      Atualizar
                    </button>
                  </div>
                </div>
                {sectionLoading ? (
                  <div className="data-state">Carregando dados...</div>
                ) : sectionError ? (
                  <div className="data-state error-message">{sectionError}</div>
                ) : visibleData.length ? (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {(columns[activeSection] ?? []).map(([, label]) => (
                            <th key={label}>{label}</th>
                          ))}
                          {["Usinas", "Clientes", "Faturas"].includes(
                            activeSection,
                          ) ? (
                            <th>Ações</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleData.map((item, index) => (
                          <tr
                            className="clickable-row"
                            onClick={() => setSelectedRecord(item)}
                            key={String(item.id ?? index)}
                          >
                            {(columns[activeSection] ?? []).map(([field]) => (
                              <td key={field}>
                                {field === "status" ? (
                                  <span className="table-status">
                                    {formatCell(field, item[field])}
                                  </span>
                                ) : (
                                  formatCell(
                                    field,
                                    item[field] ??
                                      (field === "titular"
                                        ? item.nome
                                        : field === "valor_total_unificado"
                                          ? (item.valor_total ?? item.valor)
                                          : undefined),
                                  )
                                )}
                              </td>
                            ))}
                            {["Usinas", "Clientes", "Faturas"].includes(
                              activeSection,
                            ) ? (
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="table-action"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedRecord(item);
                                    }}
                                  >
                                    Abrir
                                  </button>
                                  <button
                                    className="table-action danger"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void deleteRecord(item);
                                    }}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="data-state">
                    <strong>Nenhum registro encontrado</strong>
                    <span>
                      {searchQuery
                        ? "Tente outro termo de busca."
                        : canCreate
                          ? "Use “Nova ação” para começar."
                          : "Os dados aparecerão aqui quando estiverem disponíveis."}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          {actionOpen && session.token ? (
            <ActionDialog
              section={activeSection}
              token={session.token}
              onClose={() => setActionOpen(false)}
              onSuccess={() => setRefreshKey((value) => value + 1)}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<PortalSession | null>(() =>
    readSession(),
  );
  const [accessType, setAccessType] = useState<AccessType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trialStage, setTrialStage] = useState<"idle" | "form" | "success">("idle");
  const [trial, setTrial] = useState({ nome: "", cpf: "", telefone: "", email: "", senha: "", confirmarSenha: "" });
  const [trialResult, setTrialResult] = useState<any>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessType || loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha: password,
          tipo: accessType,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message ?? "Não foi possível acessar sua conta.");
      const portalSession = { ...data, accessType } as PortalSession;
      sessionStorage.setItem(
        "andrade_energy_portal_session",
        JSON.stringify(portalSession),
      );
      setSession(portalSession);
      window.history.pushState(
        {},
        "",
        accessType === "GERADOR" ? "/gerador" : "/cliente",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Confira os dados e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitTrial(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (trial.senha !== trial.confirmarSenha) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/teste-gerador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trial, cpf: trial.cpf.replace(/\D/g, "") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Não foi possível iniciar o teste gratuito.");
      setTrialResult(data);
      setTrialStage("success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const routeType: AccessType | null = window.location.pathname.startsWith(
    "/gerador",
  )
    ? "GERADOR"
    : window.location.pathname.startsWith("/cliente")
      ? "CONSUMIDOR"
      : null;

  function logoutPortal() {
    sessionStorage.removeItem("andrade_energy_portal_session");
    setSession(null);
    setAccessType(null);
    window.history.replaceState({}, "", "/");
  }

  function changeAdminWorkspace(workspace: AdminWorkspace | null) {
    if (!session) return;
    if (!workspace) {
      const next = { ...session };
      delete next.adminWorkspace;
      sessionStorage.setItem("andrade_energy_portal_session", JSON.stringify(next));
      setSession(next);
      return;
    }
    const next = { ...session, adminWorkspace: workspace };
    sessionStorage.setItem("andrade_energy_portal_session", JSON.stringify(next));
    setSession(next);
  }

  if (routeType && session) {
    const isAdminGenerator = (session.accessType ?? routeType) === "GERADOR" && session.usuario?.perfil === "ADMIN";
    if (isAdminGenerator && !session.adminWorkspace) return <AdminWorkspaceChoice name={session.usuario?.nome} onChoose={changeAdminWorkspace} onLogout={logoutPortal} />;
    return (
      <PortalHome
        session={session}
        type={session.accessType ?? routeType}
        workspace={session.adminWorkspace}
        onChangeWorkspace={changeAdminWorkspace}
        onLogout={logoutPortal}
      />
    );
  }

  return (
    <main className="page-shell">
      <section className="visual-panel">
        <div className="visual-overlay" />
        <header className="brand">
          <span className="brand-logo-wrap">
            <AnimatedLogo />
            <img
              className="brand-lightbulb"
              src={bulbImage}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span>Portal de energia</span>
        </header>
        <div className="visual-copy">
          <div className="pill">
            <span /> Energia que conecta
          </div>
          <h1>
            Sua energia.
            <br />
            <em>Seu futuro.</em>
          </h1>
          <p>
            Gestão inteligente para quem consome e para quem gera energia limpa.
          </p>
        </div>
        <div className="trust-row">
          <div>
            <Icon name="check" />
            <span>Dados protegidos</span>
          </div>
          <div>
            <Icon name="check" />
            <span>Gestão transparente</span>
          </div>
        </div>
      </section>

      <section className="access-panel">
        <div className="access-content">
          {!accessType ? (
            <div className="choice-view">
              <span className="section-label">ÁREA DE ACESSO</span>
              <h2>Como você quer entrar?</h2>
              <p className="lead">
                Escolha seu perfil para acessar uma experiência feita para você.
              </p>

              <div className="role-grid">
                <button
                  className="role-card client"
                  onClick={() => setAccessType("CONSUMIDOR")}
                >
                  <span className="role-icon">
                    <Icon name="user" />
                  </span>
                  <span className="role-copy">
                    <strong>Sou cliente</strong>
                    <small>Acompanhe economia, faturas e contratos</small>
                  </span>
                  <span className="role-arrow">
                    <Icon name="arrow" />
                  </span>
                </button>
                <button
                  className="role-card generator"
                  onClick={() => setAccessType("GERADOR")}
                >
                  <span className="role-icon">
                    <Icon name="sun" />
                  </span>
                  <span className="role-copy">
                    <strong>Sou gerador</strong>
                    <small>Gerencie usinas, clientes e resultados</small>
                  </span>
                  <span className="role-arrow">
                    <Icon name="arrow" />
                  </span>
                </button>
              </div>

              <div className="support-note">
                <span>Primeiro acesso?</span>
                <a href="mailto:contato@andradese.com.br">
                  Fale com nossa equipe
                </a>
              </div>
              <div className="multi-company-note">
                <b>Plataforma multiempresa</b>
                <span>Cada empresa opera em um ambiente isolado, com sua própria equipe, dados e identidade visual.</span>
              </div>
            </div>
          ) : trialStage === "form" ? (
            <form className="login-view trial-signup" onSubmit={submitTrial}>
              <button type="button" className="back-button" onClick={() => { setTrialStage("idle"); setError(""); }}><span>←</span> Voltar ao login</button>
              <span className="trial-badge">45 DIAS GRÁTIS</span>
              <h2>Crie sua conta de teste</h2>
              <p className="lead">Use todos os recursos do app Gerador por 45 dias. Não pedimos cartão agora e o benefício é liberado uma vez por CPF.</p>
              <div className="trial-form-grid">
                <label>Nome completo<input required value={trial.nome} onChange={(e)=>setTrial({...trial,nome:e.target.value})} autoComplete="name"/></label>
                <label>CPF<input required inputMode="numeric" maxLength={14} value={trial.cpf} onChange={(e)=>setTrial({...trial,cpf:e.target.value})} placeholder="000.000.000-00"/></label>
                <label>Telefone<input inputMode="tel" value={trial.telefone} onChange={(e)=>setTrial({...trial,telefone:e.target.value})} placeholder="(00) 00000-0000"/></label>
                <label>E-mail<input required type="email" value={trial.email} onChange={(e)=>setTrial({...trial,email:e.target.value})} autoComplete="email"/></label>
                <label>Senha<input required minLength={6} type="password" value={trial.senha} onChange={(e)=>setTrial({...trial,senha:e.target.value})} autoComplete="new-password"/></label>
                <label>Confirmar senha<input required minLength={6} type="password" value={trial.confirmarSenha} onChange={(e)=>setTrial({...trial,confirmarSenha:e.target.value})} autoComplete="new-password"/></label>
              </div>
              <label className="trial-consent"><input required type="checkbox"/><span>Concordo com os Termos de Uso e a Política de Privacidade. Ao final do teste, escolherei se desejo assinar.</span></label>
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="submit-button" disabled={loading}>{loading ? "Criando seu acesso..." : <>Começar teste grátis <Icon name="arrow"/></>}</button>
            </form>
          ) : trialStage === "success" ? (
            <div className="trial-success">
              <span className="trial-success-icon">✓</span>
              <span className="section-label">CONTA CONFIGURADA</span>
              <h2>Seu teste de 45 dias começou</h2>
              <p>Olá, <strong>{trial.nome}</strong>. Sua conta do Gerador já está vinculada ao CPF informado e pronta para uso.</p>
              <div className="trial-period"><span><small>INÍCIO</small><strong>{new Date().toLocaleDateString("pt-BR")}</strong></span><span><small>FINAL DO TESTE</small><strong>{trialResult?.assinatura?.fim_teste_em ? new Date(`${trialResult.assinatura.fim_teste_em}T12:00:00`).toLocaleDateString("pt-BR") : "45 dias"}</strong></span></div>
              <div className="trial-download-wrap"><AppDownloadLink href={trialResult?.downloadUrl || APP_GERADOR_URL} app="Gerador" description="Android · conta de teste pronta" /></div>
              <button className="trial-login-link" onClick={()=>{ setEmail(trial.email); setPassword(trial.senha); setTrialStage("idle"); }}>Entrar pelo portal com esta conta</button>
              <p className="trial-footnote">Ao terminar o período, você poderá escolher um plano e assinar. Nenhuma cobrança será feita automaticamente sem sua confirmação.</p>
            </div>
          ) : (
            <form className="login-view" onSubmit={submit}>
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setAccessType(null);
                  setError("");
                }}
              >
                <span>←</span> Trocar perfil
              </button>
              <div
                className={`selected-role ${accessType === "GERADOR" ? "generator" : "client"}`}
              >
                <span className="role-icon">
                  <Icon name={accessType === "GERADOR" ? "sun" : "user"} />
                </span>
                <div>
                  <small>Você está entrando como</small>
                  <strong>
                    {accessType === "GERADOR" ? "Gerador" : "Cliente"}
                  </strong>
                </div>
              </div>
              <h2>Bem-vindo de volta</h2>
              <p className="lead">Informe seus dados para continuar.</p>

              <label>E-mail</label>
              <div className="field">
                <Icon name="mail" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </div>
              <label>Senha</label>
              <div className="field">
                <Icon name="lock" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label="Mostrar ou ocultar senha"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Icon name="eye" />
                </button>
              </div>
              <div className="form-tools">
                <label className="remember">
                  <input type="checkbox" /> <span>Lembrar de mim</span>
                </label>
                <a href="#recuperar">Esqueci minha senha</a>
              </div>
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
              <button className="submit-button" disabled={loading}>
                {loading ? (
                  "Entrando..."
                ) : (
                  <>
                    Entrar no portal <Icon name="arrow" />
                  </>
                )}
              </button>
              {accessType === "GERADOR" ? <div className="generator-trial-callout"><div><span>TESTE GRÁTIS</span><strong>45 dias para conhecer a gestão completa</strong><small>{TESTE_GRATUITO_HABILITADO ? "Cadastre-se com seu CPF, sem cartão. Depois você decide se quer assinar." : "Novos testes estão temporariamente pausados. O acesso será reaberto em breve."}</small></div><button disabled={!TESTE_GRATUITO_HABILITADO} type="button" onClick={()=>{if (!TESTE_GRATUITO_HABILITADO) return; setTrialStage("form");setError("");}}>{TESTE_GRATUITO_HABILITADO ? "Começar agora →" : "Temporariamente indisponível"}</button></div> : null}
            </form>
          )}
        </div>
        <footer>
          © 2026 Andrade Energy <span>•</span> Energia inteligente, simples e
          transparente
        </footer>
      </section>
    </main>
  );
}
