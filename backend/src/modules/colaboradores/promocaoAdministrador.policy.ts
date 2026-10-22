import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

export function opcoesPromocaoAdministrador(usuario: any): string[] {
  if (!usuario?.id || !usuario.empresa_id || !["ADMIN", "GESTOR"].includes(usuario.perfil)
    || !["ADMIN_EMPRESA", "GESTOR", "SUPERADMIN"].includes(usuario.papel_empresa)) return [];
  if (usuario.empresa_id === EMPRESA_ANDRADE_ID && usuario.perfil !== "ADMIN") return [];
  return ["COMPLETO"];
}

export function validarPromocaoAdministrador(usuario: any, alvo: any, escopo: unknown) {
  if (!opcoesPromocaoAdministrador(usuario).includes(String(escopo))) throw new Error("Você não pode conceder este acesso administrativo.");
  if (!alvo || alvo.empresa_id !== usuario.empresa_id || alvo.usuario_id === usuario.id
    || !alvo.ativo || !["COLABORADOR_GERADOR", "COLABORADOR_COMERCIAL"].includes(alvo.papel))
    throw new Error("Selecione um colaborador ativo e já cadastrado nesta empresa.");
  if (alvo.papel === "COLABORADOR_COMERCIAL" && (usuario.perfil !== "ADMIN" || usuario.empresa_id !== EMPRESA_ANDRADE_ID))
    throw new Error("Somente a administração Andrade pode alterar a equipe comercial.");
}
