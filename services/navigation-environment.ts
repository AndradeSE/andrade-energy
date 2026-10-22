export type NavigationEnvironment = "comercial" | "gerador";
export function environmentForRoute(pathname: string, explicit?: string): NavigationEnvironment | undefined {
  if (explicit === "comercial" || explicit === "gerador") return explicit;
  if (pathname === "/admin/comercial" || pathname.startsWith("/geradores/")) return "comercial";
  if (pathname === "/" || pathname.startsWith("/(tabs)") || pathname === "/selecionar-unidade" || /^\/(usinas|clientes|unidades|faturas|faturamento|financeiro|contratos?|operacao)(\/|$)/.test(pathname)) return "gerador";
}
