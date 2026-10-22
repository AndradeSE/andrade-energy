export function collaboratorRedirect(role: unknown, pathname: string, permissions: Record<string, unknown> = {}): string | undefined {
  if (String(role ?? "").startsWith("COLABORADOR_") && ((pathname.startsWith("/colaboradores") && pathname !== "/colaboradores/atividade") || pathname === "/equipe" || pathname === "/(tabs)/equipe")) {
    return role === "COLABORADOR_COMERCIAL" ? "/admin/comercial" : "/";
  }
  if (role === "COLABORADOR_COMERCIAL") {
    if (permissions.ambientes_gerador === true && pathname !== "/financeiro" && !pathname.startsWith("/financeiro/") && !pathname.startsWith("/colaboradores") && pathname !== "/equipe" && pathname !== "/(tabs)/equipe" && pathname !== "/admin/empresas") return;
    if (pathname === "/" || pathname.startsWith("/selecionar-") || pathname.startsWith("/(tabs)")
      || /^\/(clientes|unidades|usinas|faturas|faturamento|financeiro|contratos?|operacao|assinatura)(\/|$)/.test(pathname)
      || pathname === "/admin/escolher-area" || pathname === "/admin/empresas" || (pathname.startsWith("/colaboradores") && pathname !== "/colaboradores/atividade")) return "/admin/comercial";
  }
  if (role === "COLABORADOR_GERADOR" && (pathname === "/admin/comercial" || pathname.startsWith("/geradores/"))) return "/selecionar-unidade";
}

export function generatorTabAllowed(name: string, role: unknown, permissions: Record<string, unknown> = {}) {
  if (!String(role ?? "").startsWith("COLABORADOR_")) return true;
  if (role === "COLABORADOR_COMERCIAL" && permissions.ambientes_gerador !== true) return false;
  if (["equipe", "financeiro"].includes(name)) return false;
  const permission = ({ clientes: "clientes", operacao: "operacao", faturamento: "faturas", contrato: "contratos" } as Record<string, string>)[name];
  if (role === "COLABORADOR_COMERCIAL" && permission) return permissions[`gerador_${permission}`] === true;
  return !permission || permissions[permission] !== false;
}
