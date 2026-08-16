import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { buscarDashboard } from "../services/dashboard.service";

export function useDashboard() {
  const { usuario, unidadeSelecionada } = useAuth();

  return useQuery({
    queryKey: ["dashboard", unidadeSelecionada?.cliente_id ?? usuario?.cliente_id, unidadeSelecionada?.numero],

    enabled: !!(unidadeSelecionada?.cliente_id ?? usuario?.cliente_id),

    queryFn: () =>
      buscarDashboard((unidadeSelecionada?.cliente_id ?? usuario!.cliente_id)!, unidadeSelecionada?.numero),
  });
}
