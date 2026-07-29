import { useQuery } from "@tanstack/react-query";
import { listarFaturas } from "../services/faturas.service";

export function useFaturas(clienteId: string) {
  return useQuery({
    queryKey: ["faturas", clienteId],
    queryFn: () => listarFaturas(clienteId),
  });
}