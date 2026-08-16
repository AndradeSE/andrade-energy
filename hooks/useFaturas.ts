import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { listarFaturas } from "../services/faturas.service";

export function useFaturas() {
  const { usuario, unidadeSelecionada } = useAuth();
  const proprietario = usuario?.perfil !== "LEITURA";

  return useQuery({
    queryKey: ["faturas", proprietario ? "todas" : unidadeSelecionada?.cliente_id ?? usuario?.cliente_id, proprietario ? undefined : unidadeSelecionada?.numero],
    enabled: proprietario || !!(unidadeSelecionada?.cliente_id ?? usuario?.cliente_id),
    queryFn: () => proprietario
      ? listarFaturas()
      : unidadeSelecionada?.numero
      ? listarFaturas(undefined, unidadeSelecionada.numero)
      : listarFaturas((unidadeSelecionada?.cliente_id ?? usuario!.cliente_id)!),
  });
}
