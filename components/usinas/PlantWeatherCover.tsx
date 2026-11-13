import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Children, type ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, AppState, Easing, ImageBackground, type ImageSourcePropType, Linking, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../assistant/AssistantNativeControls";
import { buscarClimaUsina, type ClimaUsina } from "../../services/usina-clima.service";
import { useAuth } from "../../contexts/AuthContext";

const weatherBackgrounds = {
  sol: require("../../assets/images/weather/solar-sunny.png"),
  nublado: require("../../assets/images/weather/solar-cloudy.png"),
  chuva: require("../../assets/images/weather/solar-rainy.png"),
  noite: require("../../assets/images/weather/solar-night.png"),
};

const rainLayers = [
  { count: 15, duration: 1040, opacity: 0.13, width: 0.6, length: 7 },
  { count: 13, duration: 830, opacity: 0.18, width: 0.8, length: 10 },
  { count: 10, duration: 660, opacity: 0.22, width: 0.9, length: 13 },
  { count: 7, duration: 510, opacity: 0.27, width: 1.1, length: 17 },
].map((layer, layerIndex) => ({
  ...layer,
  drops: Array.from({ length: layer.count }, (_, index) => {
    const seed = index + 1 + layerIndex * 31;
    const scatter = (factor: number) => {
      const value = Math.sin(seed * factor) * 43758.5453;
      return value - Math.floor(value);
    };
    return { x: scatter(12.9898), y: scatter(78.233), length: layer.length * (.65 + scatter(29.413) * .7), opacity: layer.opacity * (.6 + scatter(43.713) * .75) };
  }),
}));

function PlantRain({ animate }: { animate: boolean }) {
  const [phases] = useState(() => rainLayers.map(() => new Animated.Value(0)));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  useEffect(() => {
    if (!animate || !height) return;
    const loops = phases.map((value, index) => Animated.loop(
      Animated.timing(value, { toValue: 1, duration: rainLayers[index].duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
    ));
    loops.forEach(loop => loop.start());
    return () => {
      loops.forEach(loop => loop.stop());
      phases.forEach(phase => phase.setValue(0));
    };
  }, [animate, height, phases]);

  return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current => current.width === width && current.height === height ? current : { width, height });
  }}>
    {animate && width > 0 && height > 0 ? rainLayers.map((layer, index) => {
      const drift = -height * .18;
      return <Animated.View key={layer.duration} style={[StyleSheet.absoluteFill, {
        transform: [
          { translateX: phases[index].interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { translateY: phases[index].interpolate({ inputRange: [0, 1], outputRange: [0, height] }) },
        ],
      }]}>
        {[-1, 0].flatMap(tile => layer.drops.map((drop, dropIndex) => (
          <View key={`${tile}-${dropIndex}`} style={[styles.drop, {
            left: drop.x * (width - drift) + tile * drift,
            top: height * (tile + drop.y),
            opacity: drop.opacity,
            width: layer.width,
            height: drop.length,
          }]} />
        )))}
      </Animated.View>;
    }) : null}
  </View>;
}

export default function PlantWeatherCover({ usinaId, source, photoUri, children }: { usinaId: string; source: ImageSourcePropType; photoUri?: string | null; children: ReactNode }) {
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
  const background = photoUri ? { uri: photoUri } : fresh ? weatherBackgrounds[night ? "noite" : rain ? "chuva" : cloudy ? "nublado" : "sol"] : source;
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
  return <ImageBackground source={background} imageStyle={styles.image} style={styles.cover}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={night ? ["rgba(4,13,48,.08)", "rgba(3,18,40,.14)"] : ["transparent", "rgba(2,25,18,.08)"]} style={StyleSheet.absoluteFill} />
      {rain ? <PlantRain animate={focused && active && !reduced} /> : null}
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
  drop: { position: "absolute", borderRadius: 2, backgroundColor: "#D4E9FF", transform: [{ rotate: "10deg" }] },
  star: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: "#FFF8D8" },
});
