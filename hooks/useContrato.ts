import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";

import { buscarContrato } from "../services/contratos.service";

export function useContrato() {

  const { usuario, unidadeSelecionada } = useAuth();

  return useQuery({

    queryKey: [
      "contrato",
      unidadeSelecionada?.cliente_id ?? usuario?.cliente_id,
    ],

    enabled: !!(unidadeSelecionada?.cliente_id ?? usuario?.cliente_id),

    queryFn: () =>
      buscarContrato(
        (unidadeSelecionada?.cliente_id ?? usuario!.cliente_id)!
      ),

  });

}
