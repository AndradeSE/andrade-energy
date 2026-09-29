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
      "por-uc-v2",
      unidadeId ?? clienteIdDireto ?? unidadeSelecionada?.numero ?? usuario?.cpf,
    ],

    enabled: Boolean(unidadeId || clienteIdDireto || usuario?.cpf),

    queryFn: async () => {
      if (unidadeId) return buscarContratoDaUnidade(unidadeId, false, true);

      let clienteId = clienteIdDireto;
      const unidades = await listarMinhasUnidades();
      const atual = unidadeSelecionada?.numero
        ? unidades.find((unidade: any) => String(unidade.numero) === String(unidadeSelecionada.numero))
        : unidades.length === 1 ? unidades[0] : null;
      if (atual?.id) return buscarContratoDaUnidade(String(atual.id), false, true);
      if (unidades.length > 1) throw new Error("Selecione a unidade para consultar o contrato.");
      clienteId = clienteId ?? atual?.cliente_id;
      if (!clienteId) throw new Error("Cliente da unidade não identificado.");
      return buscarContrato(String(clienteId));
    },

  });

}
