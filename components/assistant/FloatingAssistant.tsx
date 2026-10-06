import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const SIZE = 54;
let savedPosition: { x: number; y: number } | undefined;

export default function FloatingAssistant() {
  const { width, height } = useWindowDimensions();
  const position = useRef(savedPosition ?? { x: Math.max(8, width - SIZE - 12), y: Math.max(80, height * 0.65) });
  const origin = useRef({ ...position.current });
  const animated = useRef(new Animated.ValueXY(position.current)).current;
  const eyes = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(Animated.sequence([
      Animated.delay(2300),
      Animated.timing(eyes, { toValue: 0.12, duration: 85, useNativeDriver: true }),
      Animated.timing(eyes, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.delay(260),
      Animated.timing(eyes, { toValue: 0.12, duration: 85, useNativeDriver: true }),
      Animated.timing(eyes, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [eyes]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { origin.current = { ...position.current }; },
    onPanResponderMove: (_event, gesture) => {
      const x = Math.max(8, Math.min(width - SIZE - 8, origin.current.x + gesture.dx));
      const y = Math.max(70, Math.min(height - SIZE - 100, origin.current.y + gesture.dy));
      animated.setValue({ x, y });
      position.current = { x, y };
      savedPosition = { x, y };
    },
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) router.push("/assistente");
    },
  }), [animated, height, width]);

  return <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Abrir Ajuda Andrade Energy; arraste o sol para mover" style={[styles.button, { transform: animated.getTranslateTransform() }]}>
    <Ionicons name="sunny" size={53} color="#FFC928" />
    <Animated.View style={styles.face}>
      <Animated.View style={[styles.eyes, { transform: [{ scaleY: eyes }] }]}><Animated.View style={styles.eye} /><Animated.View style={styles.eye} /></Animated.View>
      <Animated.View style={styles.smile} />
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 5 },
  face: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFC928", alignItems: "center", justifyContent: "center" },
  eyes: { flexDirection: "row", gap: 9, marginTop: 3 },
  eye: { width: 3, height: 5, borderRadius: 2, backgroundColor: "#604000" },
  smile: { width: 11, height: 5, borderBottomWidth: 1.5, borderBottomColor: "#604000", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginTop: 3 },
});
