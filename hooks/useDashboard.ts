import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { buscarDashboard } from "../services/dashboard.service";
import { listarMinhasUnidades } from "../services/clientes.service";

export function useDashboard() {
  const { usuario, unidadeSelecionada } = useAuth();

  return useQuery({
    queryKey: ["dashboard", usuario?.id, usuario?.empresa_id, unidadeSelecionada?.cliente_id ?? usuario?.cliente_id, unidadeSelecionada?.id, unidadeSelecionada?.numero],

    enabled: !!usuario,

    queryFn: async () => {
      let clienteId = unidadeSelecionada?.cliente_id;
      // Uma unidade antiga salva pode não conter o vínculo. Resolva somente
      // a unidade escolhida entre as unidades autorizadas pela sessão.
      if (!clienteId && unidadeSelecionada) {
        const unidades = await listarMinhasUnidades();
        const unidade = unidades.find((item: { id: string; numero: string }) =>
          item.id === unidadeSelecionada.id ||
          String(item.numero) === String(unidadeSelecionada.numero)
        );
        clienteId = unidade?.cliente_id;
      } else if (!unidadeSelecionada) {
        clienteId = usuario?.cliente_id;
      }
      if (!clienteId) throw new Error("Selecione novamente sua unidade consumidora para carregar a energia.");
      return buscarDashboard(clienteId, unidadeSelecionada?.numero);
    },
  });
}
