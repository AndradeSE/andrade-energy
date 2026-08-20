import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";

import { buscarContrato } from "../services/contratos.service";
import { listarMinhasUnidades } from "../services/clientes.service";

export function useContrato() {

  const { usuario, unidadeSelecionada } = useAuth();

  const clienteIdDireto = unidadeSelecionada?.cliente_id ?? usuario?.cliente_id;

  return useQuery({

    queryKey: [
      "contrato",
      clienteIdDireto ?? unidadeSelecionada?.numero ?? usuario?.cpf,
    ],

    enabled: Boolean(clienteIdDireto || usuario?.cpf),

    queryFn: async () => {
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
