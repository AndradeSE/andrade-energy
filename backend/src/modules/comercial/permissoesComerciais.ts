import { EMPRESA_ANDRADE_ID, usuarioEhSuperAdministradorAndrade } from "../../config/empresa";

export const PERMISSOES_COMERCIAL = {
  ambientes_gerador: false,
  geradores: true, monitoramento: true, documentos: true,
  geradores_convidar: false, geradores_editar: false,
  planos_consultar: false, cobrancas_consultar: false, cobrancas_lembrar: false,
  propostas_preparar: false, contratos_consultar: false, contratos_enviar: false, documentos_enviar: false,
};
export type PermissaoComercial = keyof typeof PERMISSOES_COMERCIAL;
export function permissaoComercial(usuario: any, chave: PermissaoComercial): boolean {
  if (String(usuario?.papel_empresa ?? "").startsWith("COLABORADOR_")) {
    if (usuario.papel_empresa !== "COLABORADOR_COMERCIAL" || usuario.empresa_id !== EMPRESA_ANDRADE_ID) return false;
    if (["geradores_convidar", "geradores_editar"].includes(chave) && !permissaoComercial(usuario, "geradores")) return false;
    if (chave === "documentos_enviar" && (!permissaoComercial(usuario, "documentos") || !permissaoComercial(usuario, "geradores"))) return false;
    if (chave === "contratos_enviar" && !permissaoComercial(usuario, "geradores_convidar")) return false;
    if (chave === "cobrancas_lembrar" && !permissaoComercial(usuario, "cobrancas_consultar")) return false;
    return PERMISSOES_COMERCIAL[chave] ? usuario.permissoes?.[chave] !== false : usuario.permissoes?.[chave] === true;
  }
  return usuarioEhSuperAdministradorAndrade(usuario);
}
export function normalizarPermissoesComerciais(entrada: any) {
  return Object.fromEntries(Object.entries(PERMISSOES_COMERCIAL).map(([chave, padrao]) => [chave, padrao ? entrada?.[chave] !== false : entrada?.[chave] === true]));
}
