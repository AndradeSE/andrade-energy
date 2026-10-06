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
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) router.push("/assistente");
    },
  }), [animated, height, width]);

  if (loading) return null;
  return <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Abrir chat com a Ajuda Andrade Energy; arraste para mover" style={[styles.button, { transform: animated.getTranslateTransform() }]}>
    <Animated.View pointerEvents="none" style={[styles.halo, { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }] }]} />
    <Animated.View pointerEvents="none" style={{ transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }) }, { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }}>
      <Image source={require("../../assets/images/assistant-chat-3d-v2.png")} style={styles.chat} resizeMode="contain" />
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 5 },
  chat: { width: 64, height: 64 },
  halo: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: "#16B778", shadowColor: "#B6DB5C", shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
});
