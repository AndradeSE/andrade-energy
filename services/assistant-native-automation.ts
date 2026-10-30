import api from "../config/api";
import type { AutomationContext, AutomationIO } from "../shared/solar-automation";
export function nativeAutomationContext(user: Record<string, any> | null, generator: boolean, plantId: string | undefined, scope: string): AutomationContext {
  const collaborator = String(user?.papel_empresa ?? "").startsWith("COLABORADOR_");
  const manager = ["ADMIN", "GESTOR"].includes(String(user?.perfil));
  const allowedSections = ["Perfil"];
  if (!generator) allowedSections.push("Minha unidade");
  if (generator && manager && user?.permissoes?.clientes !== false) allowedSections.push("Clientes");
  if (generator && manager && !collaborator && user?.permissoes?.usinas !== false) allowedSections.push("Usinas");
  return { variant: generator ? "GERADOR" : "CONSUMIDOR", plantId, scope, allowedSections };
}
export function nativeAutomationIO(isCurrent: () => boolean): AutomationIO {
  const perform = async (request: () => Promise<{ data: unknown }>, writing = false) => {
    try { return (await request()).data; }
    catch (reason: any) {
      const message = reason?.response?.data?.message;
      throw new Error(typeof message === "string" ? message : writing ? "Não foi possível confirmar o salvamento. Consulte o cadastro antes de repetir." : "Não foi possível consultar o cadastro. Confira a conexão e tente novamente.");
    }
  };
  return {
    isCurrent,
    get: async path => perform(() => api.get(path, { timeout: 12_000 })),
    change: async (path, method, body) => {
      if (!isCurrent()) throw Error("O ambiente mudou. Nenhuma alteração foi enviada.");
      return perform(() => api.request({ url: path, method, data: body, timeout: 15_000 }), true);
    },
  };
}
