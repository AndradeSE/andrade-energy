export function collaboratorRedirect(role: unknown, pathname: string): string | undefined {
  if (String(role ?? "").startsWith("COLABORADOR_") && (pathname === "/colaboradores" || pathname === "/colaboradores/" || pathname === "/colaboradores/index" || pathname === "/equipe" || pathname === "/(tabs)/equipe")) {
    return role === "COLABORADOR_COMERCIAL" ? "/admin/comercial" : "/";
  }
  if (role === "COLABORADOR_COMERCIAL") {
    if (pathname === "/" || pathname.startsWith("/selecionar-") || pathname.startsWith("/(tabs)")
      || /^\/(clientes|unidades|usinas|faturas|faturamento|financeiro|contratos?|operacao|assinatura)(\/|$)/.test(pathname)
      || pathname === "/admin/escolher-area" || pathname === "/admin/empresas" || (pathname.startsWith("/colaboradores") && pathname !== "/colaboradores/atividade")) return "/admin/comercial";
  }
  if (role === "COLABORADOR_GERADOR" && (pathname === "/admin/comercial" || pathname.startsWith("/geradores/"))) return "/selecionar-unidade";
}

export function generatorTabAllowed(name: string, role: unknown, permissions: Record<string, unknown> = {}) {
  if (!String(role ?? "").startsWith("COLABORADOR_")) return true;
  if (role === "COLABORADOR_COMERCIAL") return false;
  if (["equipe", "financeiro"].includes(name)) return false;
  const permission = ({ clientes: "clientes", operacao: "operacao", faturamento: "faturas", contrato: "contratos" } as Record<string, string>)[name];
  return !permission || permissions[permission] !== false;
}
