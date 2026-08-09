import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { listarFaturas } from "../services/faturas.service";

export function useFaturas() {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["faturas", usuario?.cliente_id],

    enabled: !!usuario?.cliente_id,

    queryFn: () =>
      listarFaturas(usuario!.cliente_id!),
  });
}