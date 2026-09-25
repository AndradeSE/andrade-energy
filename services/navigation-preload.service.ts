import type { QueryClient } from "@tanstack/react-query";

import { buscarDashboard } from "./dashboard.service";
import { listarClientes, listarMinhasUnidades, listarUnidadesGestor } from "./clientes.service";
import { buscarContrato, buscarContratoDaUnidade, listarAcessoContratos } from "./contratos.service";
import { listarFaturas } from "./faturas.service";
import { obterResumoOperacao, listarFechamentos } from "./fechamentos.service";
import { carregarFinanceiro } from "./financeiro.service";
import { carregarCarteira } from "./carteira.service";
import { buscarDashboardUsina, consultarAlocacao, listarUsinas } from "./usinas.service";
import { obterPainelComercial, obterFinanceiroAssinaturas } from "./comercial.service";

export const initialTabKey = (userId: string, plantId: string | undefined, tab: string) =>
  ["initial-tab", userId, plantId ?? "todas", tab] as const;

type Scope = {
  id?: string | number;
  cliente_id?: string | null;
  cpf?: string | null;
  empresa_id?: string | null;
  usina_id?: string | null;
  perfil?: string | null;
  papel_empresa?: string | null;
};

type Selection = { id?: string | null; numero?: string | null; cliente_id?: string | null } | null;

/** Carrega em paralelo os dados das abas principais enquanto o splash inicial está visível. */
export async function preloadNavigationData(
  queryClient: QueryClient,
  generator: boolean,
  user: Scope,
  unit: Selection,
  plant: { id?: string | null } | null,
) {
  if (!user.id) return;
  const tasks: Promise<unknown>[] = [];
  const userId = String(user.id);
  if (generator) {
    if (user.empresa_id && (user.perfil === "ADMIN" || user.papel_empresa === "COLABORADOR_COMERCIAL")) {
      tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, undefined, "comercial"), queryFn: obterPainelComercial }));
      tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, undefined, "comercial-financeiro"), queryFn: () => obterFinanceiroAssinaturas().catch(() => null) }));
    }
    const plantId = plant?.id ?? user.usina_id ?? undefined;
    tasks.push(queryClient.prefetchQuery({
      queryKey: ["dashboard-usina", plantId],
      queryFn: async () => {
        const id = plantId ?? (await listarUsinas())?.[0]?.id;
        if (!id) throw new Error("Nenhuma usina selecionada");
        const [dashboard, capacidade] = await Promise.all([buscarDashboardUsina(id), consultarAlocacao(id)]);
        return { ...dashboard, capacidadeReservada: capacidade.reservado, capacidadeDisponivel: capacidade.disponivel };
      },
    }));
    tasks.push(queryClient.prefetchQuery({ queryKey: ["faturas", plantId ?? "todas", undefined], queryFn: () => listarFaturas(undefined, undefined, plantId ?? undefined) }));
    tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, plantId, "clientes"), queryFn: () => listarClientes(plantId ?? undefined) }));
    tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, plantId, "usinas"), queryFn: () => listarUsinas() }));
    tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, plantId, "faturamento"), queryFn: () => listarUnidadesGestor() }));
    tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, plantId, "operacao"), queryFn: () => Promise.all([obterResumoOperacao(), listarFechamentos()]) }));
    tasks.push(queryClient.prefetchQuery({ queryKey: initialTabKey(userId, plantId, "financeiro"), queryFn: () => Promise.allSettled([carregarFinanceiro(), carregarCarteira()]) }));
  } else {
    tasks.push(queryClient.prefetchQuery({ queryKey: ["initial-contract-access", userId], queryFn: listarAcessoContratos }));
    let clientId = unit?.cliente_id ?? user.cliente_id;
    if (!clientId && unit?.id) {
      const units = await listarMinhasUnidades().catch(() => []);
      clientId = units.find((entry: any) => entry.id === unit.id)?.cliente_id ?? null;
    }
    if (!clientId) {
      await Promise.allSettled(tasks);
      return;
    }
    const number = unit?.numero ?? undefined;
    const contractKey = unit?.id ?? clientId ?? number ?? user.cpf;
    tasks.push(queryClient.prefetchQuery({
      queryKey: ["dashboard", user.id, user.empresa_id, clientId, unit?.id, number],
      queryFn: () => buscarDashboard(String(clientId), number ?? undefined),
    }));
    tasks.push(queryClient.prefetchQuery({
      queryKey: ["faturas", clientId, number],
      queryFn: () => number ? listarFaturas(undefined, number) : listarFaturas(String(clientId)),
    }));
    tasks.push(queryClient.prefetchQuery({
      queryKey: ["contrato", contractKey],
      queryFn: () => unit?.id ? buscarContratoDaUnidade(String(unit.id), false, true) : buscarContrato(String(clientId)),
    }));
  }
  await Promise.allSettled(tasks);
}
