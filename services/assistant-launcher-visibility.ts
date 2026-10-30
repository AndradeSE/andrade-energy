export function assistantLauncherAvailable(pathname: string, generator: boolean, plantId?: string, unitId?: string) {
  if (pathname.startsWith("/selecionar-") || pathname === "/admin/escolher-area" || pathname === "/admin/empresas") return false;
  if (!generator) return Boolean(unitId);
  return pathname === "/admin/comercial" || pathname.startsWith("/geradores/") || Boolean(plantId);
}
