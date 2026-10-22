export const COMMERCIAL_PERMISSION_LABELS = {
  ambientes_gerador: "Trocar e gerenciar ambientes do gerador (sem financeiro)",
  geradores: "Geradores — consultar",
  geradores_convidar: "Geradores — cadastrar e enviar convite",
  geradores_editar: "Geradores — editar nome e telefone",
  planos_consultar: "Planos — consultar valores e benefícios",
  propostas_preparar: "Propostas — preparar contratação do sistema",
  contratos_consultar: "Contratos — consultar termos do sistema",
  contratos_enviar: "Contratos — enviar contratação para aceite",
  monitoramento: "Monitoramento — situação e vencimentos",
  documentos: "Documentos — consultar",
  documentos_enviar: "Documentos — enviar termos aprovados",
  cobrancas_consultar: "Cobranças — consultar pendências",
  cobrancas_lembrar: "Cobranças — enviar lembrete por e-mail",
};
const LEGACY = new Set(["geradores", "monitoramento", "documentos"]);
export function commercialPermission(permissions: Record<string, any> | undefined, key: string): boolean {
  if (["geradores_convidar", "geradores_editar"].includes(key) && !commercialPermission(permissions, "geradores")) return false;
  if (key === "documentos_enviar" && (!commercialPermission(permissions,"documentos") || !commercialPermission(permissions,"geradores"))) return false;
  if (key === "contratos_enviar" && !commercialPermission(permissions,"geradores_convidar")) return false;
  if (key === "cobrancas_lembrar" && !commercialPermission(permissions, "cobrancas_consultar")) return false;
  return LEGACY.has(key) ? permissions?.[key] !== false : permissions?.[key] === true;
}
