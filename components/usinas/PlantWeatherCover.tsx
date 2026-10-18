import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Children, type ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, AppState, Easing, ImageBackground, type ImageSourcePropType, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { buscarClimaUsina, type ClimaUsina } from "../../services/usina-clima.service";
import { useAuth } from "../../contexts/AuthContext";

export default function PlantWeatherCover({ usinaId, source, children }: { usinaId: string; source: ImageSourcePropType; children: ReactNode }) {
  const focused = useIsFocused();
  const { usuario } = useAuth();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [reduced, setReduced] = useState(true);
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const state = AppState.addEventListener("change", value => setActive(value === "active"));
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => undefined);
    return () => { mounted = false; state.remove(); motion.remove(); };
  }, []);
  const query = useQuery<ClimaUsina>({
    queryKey: ["clima-usina", usuario?.empresa_id, usuario?.id, usinaId],
    queryFn: () => buscarClimaUsina(usinaId),
    enabled: focused && active && Boolean(usuario?.id && usinaId),
    staleTime: 10 * 60_000, refetchInterval: focused && active ? 15 * 60_000 : false,
    refetchIntervalInBackground: false, retry: false,
  });
  const climate = query.data;
  const fresh = climate?.disponivel === true && typeof climate.temperatura === "number" && ["sol", "nublado", "chuva", "noite"].includes(climate.tipo ?? "") && Boolean(climate.referencia) && Math.abs(Date.now() - Date.parse(climate.referencia!)) < 70 * 60_000;
  useEffect(() => {
    if (!focused || !active || reduced || !fresh) { phase.stopAnimation(); phase.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 6500, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); phase.setValue(0); };
  }, [focused, active, reduced, fresh, phase]);
  const night = fresh && climate?.noite;
  const rain = fresh && climate?.tipo === "chuva";
  const cloudy = fresh && climate?.tipo === "nublado";
  const icon = rain ? "rainy" : night ? "moon" : cloudy ? "cloud" : "sunny";
  const parts = Children.toArray(children);
  let time = "";
  if (fresh && climate?.consultadoEm) {
    try { time = new Date(climate.consultadoEm).toLocaleTimeString("pt-BR", { timeZone: climate.fuso || "UTC", hour: "2-digit", minute: "2-digit" }); } catch { time = ""; }
  }
  function details() {
    Alert.alert("Clima na região da usina", `${climate?.regiao ?? "Região não identificada"}\nEstimativa meteorológica regional pelo município/UF cadastrado, não medição no local.\n${climate?.referencia ? `Referência: ${new Date(climate.referencia).toLocaleString("pt-BR", { timeZone: climate.fuso || "UTC" })}` : climate?.motivo ?? "Confira o município e a UF no endereço da usina."}\nFonte: MET Norway · CC BY 4.0. Base municipal: Municípios Brasileiros (kelvins, MIT).`, [
      { text: "Fechar", style: "cancel" },
      { text: "Fonte e licença", onPress: () => { void Linking.openURL("https://api.met.no/doc/License").catch(() => undefined); } },
    ]);
  }
  return <ImageBackground source={source} imageStyle={styles.image} style={styles.cover}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={night ? ["#07132E", "#123344"] : rain ? ["rgba(55,74,90,.6)", "rgba(18,47,58,.48)"] : cloudy ? ["rgba(126,143,148,.4)", "rgba(31,70,65,.3)"] : ["rgba(255,205,78,.06)", "rgba(2,25,18,.12)"]} style={StyleSheet.absoluteFill} />
      {fresh && rain ? [18, 45, 76].map((left, i) => <Animated.View key={left} style={[styles.drop, { left: `${left}%`, opacity: phase.interpolate({ inputRange: [0, .15, .8, 1], outputRange: [0, .55, .55, 0] }), transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [-30 - i * 30, 210] }) }, { rotate: "14deg" }] }]} />) : null}
      {fresh && night && !rain ? [15, 52, 83].map((left, i) => <Animated.View key={left} style={[styles.star, { left: `${left}%`, top: 28 + i * 17, opacity: phase.interpolate({ inputRange: [0, .5, 1], outputRange: [.25, .85, .25] }) }]} />) : null}
    </View>
    <LinearGradient colors={["rgba(2,25,18,.08)", "rgba(2,25,18,.88)"]} style={styles.shade}>
      <Pressable accessibilityRole="button" accessibilityLabel={fresh ? `${climate?.descricao}, ${climate?.temperatura} graus em ${climate?.regiao}. Ver detalhes do clima.` : "Clima indisponível. Ver detalhes."} onPress={event => { event.stopPropagation(); details(); }} style={styles.weather}>
        <Animated.View style={{ transform: [{ rotate: fresh && !night && !cloudy && !rain ? phase.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) : "0deg" }, { translateX: cloudy ? phase.interpolate({ inputRange: [0, .5, 1], outputRange: [-4, 4, -4] }) : 0 }] }}><Ionicons name={fresh ? icon : "cloud-outline"} size={24} color={fresh && !night && !cloudy && !rain ? "#FFD34F" : "#EAF7FF"} /></Animated.View>
        <View style={styles.copy}><Text style={styles.condition}>{fresh ? `${climate?.descricao} · ${climate?.temperatura}°C` : query.isPending && !query.error ? "Consultando clima…" : "Clima indisponível"}</Text><Text numberOfLines={1} style={styles.location}>{fresh ? `${climate?.regiao}${time ? ` · ${time}${climate?.fuso === "UTC" ? " UTC" : ""}` : ""}` : "Pelo endereço cadastrado da usina"}</Text></View>
        <Ionicons name="information-circle-outline" size={15} color="#D8EBE5" />
      </Pressable>
      {parts}
      {fresh ? <Text style={styles.source}>MET Norway · estimativa regional</Text> : null}
    </LinearGradient>
  </ImageBackground>;
}

const styles = StyleSheet.create({
  cover: { minHeight: 265, overflow: "hidden", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  image: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  shade: { flex: 1, justifyContent: "space-between", padding: 16, gap: 10 },
  weather: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 14, backgroundColor: "rgba(4,35,37,.65)", paddingVertical: 7, paddingHorizontal: 12, maxWidth: "100%" },
  copy: { flexShrink: 1 }, condition: { color: "#FFF", fontSize: 12, fontWeight: "800" }, location: { color: "#E2ECE8", fontSize: 9, marginTop: 2 },
  source: { color: "#D1E1DB", fontSize: 8, textAlign: "right" },
  drop: { position: "absolute", top: 0, width: 2, height: 22, borderRadius: 2, backgroundColor: "#D4E9FF" },
  star: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: "#FFF8D8" },
});
