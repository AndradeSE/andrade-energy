import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { buscarDashboard } from "../services/dashboard.service";

export function useDashboard() {
  const { usuario, unidadeSelecionada } = useAuth();

  return useQuery({
    queryKey: ["dashboard", usuario?.cliente_id, unidadeSelecionada?.numero],

    enabled: !!usuario?.cliente_id,

    queryFn: () =>
      buscarDashboard(usuario!.cliente_id!, unidadeSelecionada?.numero),
  });
}
