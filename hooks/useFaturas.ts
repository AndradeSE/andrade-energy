import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { listarFaturas } from "../services/faturas.service";

export function useFaturas() {
  const { usuario, unidadeSelecionada } = useAuth();

  return useQuery({
    queryKey: ["faturas", usuario?.cliente_id, unidadeSelecionada?.numero],
    enabled: !!usuario?.cliente_id,
    queryFn: () => unidadeSelecionada?.numero
      ? listarFaturas(undefined, unidadeSelecionada.numero)
      : listarFaturas(usuario!.cliente_id!),
  });
}
