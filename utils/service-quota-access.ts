export function canViewServiceQuotas(user: { perfil?: unknown; papel_empresa?: unknown; empresa_id?: unknown } | null | undefined) {
  return user?.perfil === "ADMIN" && !String(user.papel_empresa ?? "").startsWith("COLABORADOR_") &&
    user.empresa_id === "00000000-0000-4000-8000-000000000001";
}
