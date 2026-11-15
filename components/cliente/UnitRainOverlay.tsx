import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, Text, View } from "react-native";
import api from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import type { ClimaUsina } from "../../services/usina-clima.service";
import { PlantRain } from "../usinas/PlantWeatherCover";

export default function UnitRainOverlay({ unidadeId }: { unidadeId: string }) {
  const focused = useIsFocused();
  const { usuario: user } = useAuth();
  const [reduced, setReduced] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => { const listener = AppState.addEventListener("change", value => setActive(value === "active")); return () => listener.remove(); }, []);
  useEffect(() => {
    let mounted = true;
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => undefined);
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => { mounted = false; motion.remove(); clearInterval(timer); };
  }, []);
  const { data } = useQuery<ClimaUsina>({
    queryKey: ["clima-unidade", user?.empresa_id, user?.id, unidadeId],
    queryFn: async () => (await api.get(`/clientes/unidade/${encodeURIComponent(unidadeId)}/clima`, { timeout: 15_000 })).data,
    enabled: focused && active && Boolean(user?.id && unidadeId),
    staleTime: 10 * 60_000, refetchInterval: focused && active ? 15 * 60_000 : false,
    refetchIntervalInBackground: false, retry: false,
  });
  const fresh = data?.disponivel === true && Boolean(data.referencia)
    && Number.isFinite(data.temperatura)
    && Math.abs(now - Date.parse(data.referencia!)) < 70 * 60_000;
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
    {fresh && data?.tipo === "chuva" ? <PlantRain animate={focused && active && !reduced} /> : null}
    <View style={styles.badge}><Text style={styles.label}>{fresh ? `${data?.descricao || "Clima regional"} · ${Math.round(data!.temperatura!)}°C` : "Clima indisponível"}</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  badge: { position: "absolute", top: 44, left: 16, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(3,30,22,.8)", zIndex: 2 },
  label: { color: "#FFF", fontSize: 11, fontWeight: "600" },
});
