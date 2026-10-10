import { listarClientes, listarMinhasUnidades, listarUnidadesGestor } from "./clientes.service";
import { listarUsinas } from "./usinas.service";
import { listarNotificacoesApp } from "./notificacoes.service";
import { listarAcessoContratos, listarContratosDaEmpresa } from "./contratos.service";
import { normalizeSolarRequest, hasSolarMutation, isSolarHelp } from "../shared/solar-language";

export function detectAccountQuery(text: string) {
  text = normalizeSolarRequest(text);
  if (hasSolarMutation(text) || isSolarHelp(text)) return undefined;
  if (/\b(notificacoes|avisos)\b/.test(text)) return "notificacoes";
  if (/\b(contrato|contratos)\b/.test(text)) return "contratos";
  if (/\b(ucs|uc|unidades)\b/.test(text)) return "unidades";
  if (/\b(clientes)\b/.test(text)) return "clientes";
  if (/\b(usinas)\b/.test(text)) return "usinas";
  return undefined;
}

export async function consultAccount(topic: NonNullable<ReturnType<typeof detectAccountQuery>>, generator: boolean, plantId?: string) {
  if (!generator && (topic === "clientes" || topic === "usinas")) return "Seu acesso de consumidor não permite listar a carteira do gerador. Posso consultar suas UCs, faturas e contratos.";
  if (generator && !plantId && (topic === "clientes" || topic === "unidades" || topic === "contratos")) return "Selecione uma usina para consultar a carteira correta.";
  const result = topic === "clientes" ? await listarClientes(plantId)
    : topic === "usinas" ? await listarUsinas()
    : topic === "unidades" ? generator ? await listarUnidadesGestor(plantId) : await listarMinhasUnidades()
    : topic === "contratos" ? generator ? await listarContratosDaEmpresa(plantId) : await listarAcessoContratos()
    : await listarNotificacoesApp();
  if (!Array.isArray(result)) throw new Error("Resposta de consulta inválida");
  const labels: Record<string, string> = { clientes: "clientes", usinas: "usinas", unidades: "UCs", contratos: generator ? "registros de contrato" : "UCs com acesso contratual", notificacoes: "notificações" };
  const rows = result.slice(0, 12).map(item => {
    const label = item.titulo ?? item.nome ?? item.apelido ?? item.numero ?? item.numero_instalacao ?? item.cliente_nome ?? "Registro disponível";
    const status = typeof item.status === "string" ? ` · ${item.status}` : "";
    return `• ${String(label)}${status}`;
  });
  return `Encontrei ${result.length} ${labels[topic]} no seu acesso atual.${rows.length ? `\n${rows.join("\n")}` : ""}${result.length > 12 ? "\nMostrando os primeiros 12 registros." : ""}`;
}
