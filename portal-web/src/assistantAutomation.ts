export type AutomationCommand = { entity: "profile" | "client" | "plant" | "unit"; field: "nome" | "email" | "telefone" | "apelido"; value: string; target?: string };
export type AutomationContext = { variant: "GERADOR" | "CONSUMIDOR"; scope: string; allowedSections: string[]; plantId?: string };
type Data = Record<string, unknown>;
export type AutomationDraft = Readonly<{ command: AutomationCommand; scope: string; preparedAt: number; targetId: string; targetLabel: string; before: Data; after: Data; section: string }>;
export type AutomationIO = { get: (path: string) => Promise<unknown>; change: (path: string, method: "PUT" | "PATCH", body: Data) => Promise<unknown>; isCurrent?: () => boolean };
const preparedDrafts = new WeakSet<AutomationDraft>();
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const record = (data: unknown): Data => { if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("Resposta inválida ao consultar o cadastro."); return data as Data; };
const rows = (data: unknown): Data[] => Array.isArray(data) ? data : Array.isArray((data as Data)?.data) ? (data as Data).data as Data[] : (() => { throw Error("Lista de cadastros inválida."); })();
export function parseAutomationCommand(question: string): AutomationCommand | null {
  const text = question.trim();
  const unit = text.match(/^(?:renomeie|renomear|nomeie|nomear)\s+(?:a\s+)?UC\s+(\d+)\s+para\s+(.+)$/iu);
  if (unit) return { entity: "unit", field: "apelido", target: unit[1], value: unit[2].trim() };
  const plant = text.match(/^(?:renomeie|renomear)\s+(?:a\s+)?usina\s+(.+?)\s+para\s+(.+)$/iu);
  if (plant) return { entity: "plant", field: "nome", target: plant[1].trim(), value: plant[2].trim() };
  const match = text.match(/^(?:altere|alterar|mude|mudar|atualize|atualizar)\s+(?:o\s+)?(nome|email|e-mail|telefone)\s+(?:do\s+)?(meu perfil|cliente\s+.+|usina\s+.+)\s+para\s+(.+)$/iu);
  if (!match) return null;
  const field = norm(match[1]).replace("-", "") as "nome" | "email" | "telefone";
  const entity = norm(match[2]) === "meu perfil" ? "profile" : norm(match[2]).startsWith("cliente ") ? "client" : "plant";
  return { entity, field, value: match[3].trim(), ...(entity === "profile" ? {} : { target: match[2].replace(/^(cliente|usina)\s+/iu, "").trim() }) };
}
function authorize(command: AutomationCommand, context: AutomationContext) {
  const section = { profile: "Perfil", client: "Clientes", plant: "Usinas", unit: "Minha unidade" }[command.entity];
  if (!section || !context.allowedSections.includes(section)) throw Error("Você não tem acesso a essa operação no ambiente atual.");
  if (["client", "plant"].includes(command.entity) && context.variant !== "GERADOR") throw Error("Operação disponível apenas para geradores autorizados.");
  if (command.entity === "unit" && context.variant !== "CONSUMIDOR") throw Error("Use o cadastro da UC no ambiente Gerador.");
  const allowed: Record<string, string[]> = { profile: ["nome", "email", "telefone"], client: ["nome", "email", "telefone"], plant: ["nome"], unit: ["apelido"] };
  if (!allowed[command.entity]?.includes(command.field)) throw Error("Esse campo não pode ser alterado pela Solar.");
  if (command.entity === "client" && !context.plantId) throw Error("Selecione a usina antes de editar um cliente.");
  return section;
}
function valueFor(command: AutomationCommand) {
  const value = command.value.trim();
  if (!value || value.length > (command.field === "apelido" ? 40 : 200) || /[\x00-\x1f]/.test(value)) throw Error("Informe um valor válido para a alteração.");
  if (command.field === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw Error("Informe um e-mail válido.");
    return value.toLowerCase();
  }
  if (command.field === "telefone" && !/^\+?[\d\s().-]{8,25}$/.test(value)) throw Error("Informe um telefone válido.");
  if (command.field === "nome" && command.entity !== "plant" && (!/^[\p{L}\s'’.-]+$/u.test(value) || value.split(/\s+/).filter(part => /\p{L}{2}/u.test(part)).length < 2)) throw Error("Informe nome e sobrenome válidos.");
  return value;
}
function uniqueTarget(data: unknown, target: string, field: "nome" | "numero") {
  const found = rows(data).filter(row => norm(String(row[field] ?? "")) === norm(target));
  if (found.length !== 1 || !found[0].id) throw Error("Não encontrei um único cadastro com esse nome/número. Informe o identificador completo.");
  return found[0];
}
function readPath(command: AutomationCommand, id: string, context: AutomationContext) {
  if (command.entity === "profile") return `/auth/me?tipo=${context.variant}`;
  if (command.entity === "unit") return "/clientes/minhas-unidades";
  return `/${command.entity === "client" ? "clientes" : "usinas"}/${encodeURIComponent(id)}`;
}
async function currentData(command: AutomationCommand, id: string, context: AutomationContext, io: AutomationIO) {
  const data = await io.get(readPath(command, id, context));
  if (command.entity !== "unit") {
    const current = record(data);
    if (String(current.id ?? "") !== id) throw Error("A identidade do cadastro mudou. Prepare a alteração novamente.");
    return current;
  }
  const found = rows(data).find(row => String(row.id) === id);
  if (!found) throw Error("A UC não pertence mais ao seu acesso.");
  return found;
}
function snapshot(data: Data, command: AutomationCommand): Data {
  const fields = command.entity === "profile" ? ["nome", "email", "telefone"] : [command.field];
  return Object.fromEntries(fields.map(field => [field, data[field] ?? null]));
}
export async function prepareAutomation(command: AutomationCommand, context: AutomationContext, io: AutomationIO, now = Date.now()): Promise<AutomationDraft> {
  const section = authorize(command, context);
  const value = valueFor(command);
  let target: Data;
  if (command.entity === "profile") target = record(await io.get(`/auth/me?tipo=${context.variant}`));
  else {
    if (!command.target) throw Error("Informe qual cadastro deseja alterar.");
    const path = command.entity === "unit" ? "/clientes/minhas-unidades" : command.entity === "plant" ? "/usinas" : `/clientes?usinaId=${encodeURIComponent(context.plantId!)}`;
    target = uniqueTarget(await io.get(path), command.target, command.entity === "unit" ? "numero" : "nome");
    if (command.entity === "plant" && context.plantId !== String(target.id)) throw Error("Selecione essa usina antes de alterá-la.");
    if (command.entity !== "unit") target = await currentData(command, String(target.id), context, io);
  }
  if (!target.id) throw Error("Cadastro sem identificador confirmado.");
  const before = snapshot(target, command);
  if (io.isCurrent?.() === false) throw Error("O ambiente mudou durante a consulta. Prepare a alteração novamente.");
  if (String(before[command.field] ?? "") === value) throw Error("O cadastro já tem esse valor. Nenhuma alteração é necessária.");
  const after: Data = command.entity === "profile" ? { ...before, [command.field]: value, tipo: context.variant } : { [command.field]: value };
  const draft = Object.freeze({ command: Object.freeze({ ...command, value }), scope: context.scope, preparedAt: now, targetId: String(target.id), targetLabel: command.entity === "unit" ? `UC ${target.numero}` : String(target.nome ?? "Meu perfil"), before: Object.freeze(before), after: Object.freeze(after), section });
  preparedDrafts.add(draft);
  return draft;
}
export function createAutomationExecutor() {
  const attempted = new WeakSet<AutomationDraft>();
  return async (draft: AutomationDraft, context: AutomationContext, io: AutomationIO, now = Date.now()) => {
    if (!preparedDrafts.has(draft)) throw Error("Operação sem revisão válida. Prepare a alteração pela Solar.");
    authorize(draft.command, context); valueFor(draft.command);
    if (draft.scope !== context.scope || now - draft.preparedAt > 300_000 || now < draft.preparedAt) throw Error("A confirmação expirou ou o ambiente mudou. Prepare a alteração novamente.");
    if (attempted.has(draft)) throw Error("Esta operação já foi enviada. Consulte o cadastro antes de tentar novamente.");
    // Reserve before the first await: two confirmation clicks cannot execute twice.
    attempted.add(draft);
    if (draft.command.entity === "client") {
      const accessible = rows(await io.get(`/clientes?usinaId=${encodeURIComponent(context.plantId!)}`));
      if (!accessible.some(row => String(row.id) === draft.targetId)) throw Error("O cliente não pertence mais à usina selecionada.");
    }
    const current = snapshot(await currentData(draft.command, draft.targetId, context, io), draft.command);
    if (JSON.stringify(current) !== JSON.stringify(draft.before)) throw Error("O cadastro mudou desde a revisão. Prepare a alteração novamente.");
    if (io.isCurrent?.() === false) throw Error("O ambiente mudou durante a confirmação. Nenhuma alteração foi enviada.");
    const path = draft.command.entity === "profile" ? "/auth/me" : draft.command.entity === "unit" ? `/clientes/minhas-unidades/${encodeURIComponent(draft.targetId)}/apelido` : `/${draft.command.entity === "client" ? "clientes" : "usinas"}/${encodeURIComponent(draft.targetId)}`;
    const result = record(await io.change(path, draft.command.entity === "unit" ? "PATCH" : "PUT", { ...draft.after }));
    if (String(result.id ?? "") !== draft.targetId) throw Error("O servidor não confirmou o registro alterado. Consulte o cadastro; não reenviamos a operação.");
    const confirmed = String(result[draft.command.field] ?? "");
    if ((draft.command.field === "telefone" ? confirmed.replace(/\D/g, "") : confirmed) !== (draft.command.field === "telefone" ? draft.command.value.replace(/\D/g, "") : draft.command.value)) throw Error("O servidor não confirmou o novo valor. Consulte o cadastro antes de repetir.");
    return result;
  };
}
