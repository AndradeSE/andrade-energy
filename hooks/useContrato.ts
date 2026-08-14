import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";

import { buscarContrato } from "../services/contratos.service";

export function useContrato() {

  const { usuario } = useAuth();

  return useQuery({

    queryKey: [
      "contrato",
      usuario?.cliente_id,
    ],

    enabled: !!usuario?.cliente_id,

    queryFn: () =>
      buscarContrato(
        usuario!.cliente_id!
      ),

  });

}