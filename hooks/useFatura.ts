import { useQuery } from "@tanstack/react-query";
import { buscarFatura } from "../services/faturas.service";

export function useFatura(id: string) {
  return useQuery({
    queryKey: ["fatura", id],
    enabled: !!id,
    queryFn: () => buscarFatura(id),
  });
}