import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { buscarDashboardUsina } from "../services/usinas.service";

export function useDashboardGestor() {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["dashboard-usina", usuario?.usina_id],

    enabled: !!usuario?.usina_id,

    queryFn: () =>
      buscarDashboardUsina(usuario!.usina_id!),
  });
}