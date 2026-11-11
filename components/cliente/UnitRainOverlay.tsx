import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import api from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import type { ClimaUsina } from "../../services/usina-clima.service";
import RainOverlay from "../ui/RainOverlay";

export default function UnitRainOverlay({ unidadeId }: { unidadeId: string }) {
  const focused = useIsFocused();
  const { user } = useAuth();
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => { const listener = AppState.addEventListener("change", value => setActive(value === "active")); return () => listener.remove(); }, []);
  const { data } = useQuery<ClimaUsina>({
    queryKey: ["clima-unidade", user?.empresa_id, user?.id, unidadeId],
    queryFn: async () => (await api.get(`/clientes/unidade/${encodeURIComponent(unidadeId)}/clima`, { timeout: 15_000 })).data,
    enabled: focused && active && Boolean(user?.id && unidadeId),
    staleTime: 10 * 60_000, refetchInterval: focused && active ? 15 * 60_000 : false,
    refetchIntervalInBackground: false, retry: false,
  });
  const fresh = data?.disponivel === true && Boolean(data.referencia)
    && Math.abs(Date.now() - Date.parse(data.referencia!)) < 70 * 60_000;
  return <RainOverlay running={focused && active && fresh && data?.tipo === "chuva"} />;
}