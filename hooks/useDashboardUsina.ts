import { useQuery } from "@tanstack/react-query";
import { buscarDashboardUsina } from "../services/usinas.service";

export function useDashboardUsina(usinaId: string) {
  return useQuery({
    queryKey: ["dashboard-usina", usinaId],
    queryFn: () => buscarDashboardUsina(usinaId),
  });
}