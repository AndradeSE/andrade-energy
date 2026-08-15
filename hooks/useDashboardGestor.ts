import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { buscarDashboardUsina, listarUsinas } from "../services/usinas.service";

export function useDashboardGestor() {
  const { usuario, usinaSelecionada } = useAuth();
  const proprietario =
    usuario?.perfil === "ADMIN" || usuario?.perfil === "GESTOR";

  return useQuery({
    queryKey: ["dashboard-usina", usinaSelecionada?.id ?? usuario?.usina_id],

    enabled: proprietario,

    queryFn: async () => {
      let usinaId = usinaSelecionada?.id ?? usuario?.usina_id;

      if (!usinaId) {
        const usinas = await listarUsinas();
        usinaId = usinas?.[0]?.id;
      }

      if (!usinaId) {
        throw new Error("Nenhuma usina cadastrada.");
      }

      return buscarDashboardUsina(usinaId);
    },
  });
}
