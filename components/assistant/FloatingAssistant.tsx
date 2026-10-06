import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Animated, Image, PanResponder, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";

const SIZE = 54;
let savedPosition: { x: number; y: number } | undefined;

export default function FloatingAssistant() {
  const { width, height } = useWindowDimensions();
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const position = useRef(savedPosition ?? { x: Math.max(0, width - SIZE - 12), y: Math.max(0, height * 0.65) });
  const origin = useRef({ ...position.current });
  const animated = useRef(new Animated.ValueXY(position.current)).current;
  const glow = useRef(new Animated.Value(1)).current;
  const electric = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const x = Math.max(0, Math.min(width - SIZE, position.current.x));
    const y = Math.max(0, Math.min(height - SIZE, position.current.y));
    position.current = { x, y };
    savedPosition = { x, y };
    animated.setValue({ x, y });
  }, [animated, height, width]);
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1.06, duration: 1700, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: 1700, useNativeDriver: true }),
    ]));
    const sparks = Animated.loop(Animated.sequence([
      Animated.timing(electric, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(electric, { toValue: 0.2, duration: 160, useNativeDriver: true }),
      Animated.delay(1250),
      Animated.timing(electric, { toValue: 0.9, duration: 130, useNativeDriver: true }),
      Animated.timing(electric, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.delay(1050),
    ]));
    pulse.start();
    sparks.start();
    return () => { pulse.stop(); sparks.stop(); };
  }, [electric, glow]);
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
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) router.push("/assistente");
    },
  }), [animated, height, width]);

  if (loading) return null;
  return <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Abrir Ajuda Andrade Energy; arraste o sol para mover" style={[styles.button, { transform: animated.getTranslateTransform() }]}>
    <Animated.View pointerEvents="none" style={[styles.aura, { opacity: glow.interpolate({ inputRange: [1, 1.06], outputRange: [0.35, 0.7] }), transform: [{ scale: glow }] }]} />
    <Animated.View pointerEvents="none" style={[styles.bolts, { opacity: electric, transform: [{ scale: electric.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.13] }) }] }]}>
      <Svg width={76} height={76} viewBox="0 0 76 76">
        <Path d="M18 15 L12 8 L18 9 L16 2 M47 7 L54 2 L51 10 L61 7 M67 28 L74 25 L68 33 L75 37 M65 56 L73 62 L64 61 L67 72 M31 67 L25 74 L26 65 L17 70 M8 49 L2 44 L11 45 L4 37" stroke="#59E8FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M22 8 L18 3 M59 11 L65 7 M71 47 L75 51 M12 62 L6 67" stroke="#F4FFFF" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
    <Animated.View style={{ transform: [{ scale: glow }] }}><Image source={require("../../assets/images/assistant-sun-3d-sunglasses.png")} style={styles.sun} resizeMode="contain" /></Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 5 },
  sun: { width: SIZE, height: SIZE },
  aura: { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFE04E", shadowColor: "#FFD53F", shadowOpacity: 0.8, shadowRadius: 10, elevation: 4 },
  bolts: { position: "absolute", width: 76, height: 76, alignItems: "center", justifyContent: "center" },
});
