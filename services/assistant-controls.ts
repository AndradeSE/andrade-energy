// Ponte apenas para controles realmente montados: nunca executa código,
// endpoints ou nomes de campos sugeridos pelo modelo generativo.
export type SolarControl = { id: string; label: string; scope: string; kind: "field" | "button"; active: () => boolean; invoke: (value?: string) => void; secret?: boolean; maxLength?: number };
const controls = new Map<string, SolarControl>();
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
export function solarControlScope(user: any, plantId?: string, unitId?: string) {
  return user?.id ? JSON.stringify([user.id, user.empresa_id, user.papel_empresa, user.permissoes, plantId, unitId]) : "";
}
export function registerSolarControl(control: SolarControl) {
  controls.set(control.id, control);
  return () => { if (controls.get(control.id) === control) controls.delete(control.id); };
}
export function visibleSolarControls(scope: string) {
  return [...controls.values()].filter(c => c.scope === scope && c.active() && !c.secret && !/\b(senha|password|token|codigo|autenticador)\b/.test(norm(c.label)))
    .map(c => ({ label: c.label, kind: c.kind }));
}
export function asksScreenControls(question: string) {
  return /\b(quais|liste|listar|mostre|mostrar)\b.*\b(campos|botoes|controles)\b.*\b(tela|formulario|aberto|aberta)\b/.test(norm(question));
}
export function parseControlCommand(input: string): { kind: "field" | "button"; label: string; value?: string } | undefined {
  const text = input.trim().replace(/^(?:solar[,!]?\s+)?(?:por favor[,!]?\s+)?/iu, "");
  const field = /^(?:preencha|preencher|digite|digitar|insira|inserir|coloque|colocar)\s+(?:(?:o|no)\s+campo\s+)?(.+?)\s+(?:com|para|=)\s+(.+)$/iu.exec(text);
  if (field) return { kind: "field", label: field[1].trim(), value: field[2].trim() };
  const reverse = /^(?:digite|insira|coloque)\s+(.+?)\s+no campo\s+(.+)$/iu.exec(text);
  if (reverse) return { kind: "field", label: reverse[2].trim(), value: reverse[1].trim() };
  const button = /^(?:clique|clicar|toque|tocar|aperte|apertar|pressione|pressionar|acione|acionar)\s+(?:(?:no|o)\s+)?(?:bot[aã]o\s+)?(.+)$/iu.exec(text);
  if (button) return { kind: "button", label: button[1].trim() };
  return undefined;
}
let controlOperationActive = false;
export async function operateSolarControl(question: string, scope: string, confirm: (label: string) => Promise<boolean>, isCurrent: () => boolean) {
  if (asksScreenControls(question)) {
    if (!scope || !isCurrent()) return "Entre na conta e abra um formulário.";
    const items = visibleSolarControls(scope);
    return items.length ? "Controles disponíveis na tela atual:\n" + items.slice(0, 35).map(c => `${c.kind === "field" ? "Campo" : "Botão"}: ${c.label}`).join("\n") : "Abra um formulário e use a Solar flutuante para operar os campos e botões da tela.";
  }
  if (!parseControlCommand(question)) return undefined;
  if (controlOperationActive) return "Aguarde a confirmação do comando anterior.";
  controlOperationActive = true;
  try { return await executeControl(question, scope, confirm, isCurrent); }
  finally { controlOperationActive = false; }
}
async function executeControl(question: string, scope: string, confirm: (label: string) => Promise<boolean>, isCurrent: () => boolean) {
  const command = parseControlCommand(question);
  if (!command) return undefined;
  if (!scope || !isCurrent()) return "Entre na conta e abra a tela que deseja operar.";
  const available = [...controls.values()].filter(c => c.scope === scope && c.kind === command.kind && c.active());
  const label = norm(command.label);
  const controlLabel = (c: SolarControl) => norm(c.label).replace(/\s+obrigatorio$/, "");
  let matches = available.filter(c => controlLabel(c) === label);
  if (!matches.length) matches = available.filter(c => (` ${controlLabel(c)} `).includes(` ${label} `));
  if (matches.length !== 1) return matches.length ? "Há mais de um controle com esse nome. Informe o rótulo completo." : "Não encontrei esse controle ativo na tela. Abra o formulário e use o nome exibido no campo ou botão.";
  const control = matches[0];
  if (control.secret || /\b(senha|password|token|autenticador|codigo|chave de api)\b/.test(norm(control.label))) return "Preencha senhas e códigos de segurança pessoalmente na tela. Não os dite para a Solar.";
  if (command.kind === "field" && (!command.value || command.value.length > Math.min(control.maxLength ?? 500, 2000) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(command.value))) return "Informe um valor válido para o campo.";
  if (command.kind === "button" && !await confirm(control.label)) return "Ação cancelada. Não acionei o botão.";
  if (!isCurrent() || controls.get(control.id) !== control || !control.active()) return "A tela ou o controle mudou. Repita o comando na tela atual.";
  try {
    control.invoke(command.value);
    return command.kind === "field" ? `Preenchi o campo ${control.label} no formulário. Nenhum cadastro foi salvo por esse preenchimento.` : `Acionei o botão ${control.label}. Confira o resultado e as validações do próprio aplicativo; isso não confirma que a operação terminou.`;
  } catch { return "O controle não concluiu o comando. Confira a tela antes de repetir."; }
}
