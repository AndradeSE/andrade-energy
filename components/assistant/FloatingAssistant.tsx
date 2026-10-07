import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Animated, Image, PanResponder, StyleSheet, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_TAB_BAR_METRICS } from "../navigation/AppTabBarFrame";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";
import { setWakeWordEnabled, subscribeWakeWord, wakeWordEnabled, wakeWordPaused, wakeWordReady } from "../../services/assistant-wake-word";

const SIZE = 54;
let savedPosition: { x: number; y: number } | undefined;

export default function FloatingAssistant() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const enabled = useSyncExternalStore(subscribeWakeWord, wakeWordEnabled);
  const ready = useSyncExternalStore(subscribeWakeWord, wakeWordReady);
  const paused = useSyncExternalStore(subscribeWakeWord, wakeWordPaused);
  const listening = enabled && ready && !paused;
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    wave.setValue(0);
    if (!listening || loading) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [listening, loading, wave]);
  const position = useRef(savedPosition ?? { x: Math.max(0, width - SIZE - 12), y: Math.max(0, height - insets.bottom - APP_TAB_BAR_METRICS.height - SIZE - 12) });
  const origin = useRef({ ...position.current });
  const animated = useRef(new Animated.ValueXY(position.current)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const x = Math.max(0, Math.min(width - SIZE, position.current.x));
    const y = Math.max(0, Math.min(height - SIZE, position.current.y));
    position.current = { x, y };
    savedPosition = { x, y };
    animated.setValue({ x, y });
  }, [animated, height, width]);
  useEffect(() => {
    const float = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    float.start();
    return () => float.stop();
  }, [breathe]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { origin.current = { ...position.current }; },
    onPanResponderMove: (_event, gesture) => {
      const x = Math.max(0, Math.min(width - SIZE, origin.current.x + gesture.dx));
      const y = Math.max(0, Math.min(height - SIZE, origin.current.y + gesture.dy));
      animated.setValue({ x, y });
      position.current = { x, y };
      savedPosition = { x, y };
    },
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
        if (wakeWordEnabled()) setWakeWordEnabled(false);
        else router.push("/assistente");
      }
    },
  }), [animated, height, width]);

  // Na Ajuda, as ondas já pertencem à barra de escrita: não sobreponha outro botão.
  if (loading || pathname === "/assistente") return null;
  return <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel={listening ? "Desativar comando de voz; arraste para mover" : "Abrir chat com a Ajuda Andrade Energy; arraste para mover"} style={[styles.button, { transform: animated.getTranslateTransform() }]}>
    <Animated.View pointerEvents="none" style={[styles.halo, { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }] }]} />
    {listening ? <View pointerEvents="none" style={styles.waves}>{[12, 23, 32, 23, 12].map((height, index) => <Animated.View key={index} style={{ width: 4, height, borderRadius: 2, marginHorizontal: 2, backgroundColor: "#ECFFF5", transform: [{ scaleY: wave.interpolate({ inputRange: [0, 1], outputRange: index % 2 ? [1, 0.45] : [0.45, 1] }) }] }} />)}</View> : <Animated.View pointerEvents="none" style={{ transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }) }, { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }}>
      <Image source={require("../../assets/images/assistant-chat-3d-v2.png")} style={styles.chat} resizeMode="contain" />
    </Animated.View>}
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 5 },
  chat: { width: 64, height: 64 },
  waves: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#087A52", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: "#16B778", shadowColor: "#B6DB5C", shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
});
