import { useQuery } from "@tanstack/react-query";
import { buscarDashboard } from "../services/dashboard.service";

export function useDashboard(clienteId: string) {
  return useQuery({
    queryKey: ["dashboard", clienteId],
    queryFn: () => buscarDashboard(clienteId),
  });
}