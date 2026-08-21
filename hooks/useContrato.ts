import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";

import { buscarContrato, buscarContratoDaUnidade } from "../services/contratos.service";
import { listarMinhasUnidades } from "../services/clientes.service";

export function useContrato() {

  const { usuario, unidadeSelecionada } = useAuth();

  const clienteIdDireto = unidadeSelecionada?.cliente_id ?? usuario?.cliente_id;
  const unidadeId = unidadeSelecionada?.id;

  return useQuery({

    queryKey: [
      "contrato",
      unidadeId ?? clienteIdDireto ?? unidadeSelecionada?.numero ?? usuario?.cpf,
    ],

    enabled: Boolean(unidadeId || clienteIdDireto || usuario?.cpf),

    queryFn: async () => {
      if (unidadeId) return buscarContratoDaUnidade(unidadeId);

      let clienteId = clienteIdDireto;
      if (!clienteId) {
        const unidades = await listarMinhasUnidades();
        const atual = unidades.find((unidade: any) => String(unidade.numero) === String(unidadeSelecionada?.numero)) ?? unidades[0];
        clienteId = atual?.cliente_id;
      }
      if (!clienteId) throw new Error("Cliente da unidade não identificado.");
      return buscarContrato(String(clienteId));
    },

  });

}
