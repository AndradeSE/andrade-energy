import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Animated, Image, PanResponder, StyleSheet, useWindowDimensions } from "react-native";
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
    pulse.start();
    return () => pulse.stop();
  }, [glow]);
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
    <Animated.View style={{ transform: [{ scale: glow }] }}><Image source={require("../../assets/images/assistant-sun-3d-sunglasses.png")} style={styles.sun} resizeMode="contain" /></Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 5 },
  sun: { width: SIZE, height: SIZE },
});
