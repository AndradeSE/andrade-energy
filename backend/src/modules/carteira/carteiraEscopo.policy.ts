export function podeOperarCarteiraDaUsina(usuario: any, carteira: any, empresaId: string, usinaId: string) {
  if (!usuario?.id || usuario.empresa_id !== empresaId || carteira?.empresa_id !== empresaId
    || carteira?.usina_id !== usinaId || carteira?.status !== "ATIVA"
    || String(usuario.papel_empresa ?? "").startsWith("COLABORADOR_")) return false;
  return ["ADMIN", "GESTOR"].includes(usuario.perfil)
    && (usuario.perfil === "ADMIN" || carteira.usuario_id === usuario.id);
}
