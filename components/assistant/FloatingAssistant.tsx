import { useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const SIZE = 48;

export default function FloatingAssistant() {
  const { width, height } = useWindowDimensions();
  const position = useRef({ x: Math.max(8, width - SIZE - 12), y: Math.max(80, height * 0.65) });
  const origin = useRef({ ...position.current });
  const animated = useRef(new Animated.ValueXY(position.current)).current;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { origin.current = { ...position.current }; },
    onPanResponderMove: (_event, gesture) => {
      const x = Math.max(8, Math.min(width - SIZE - 8, origin.current.x + gesture.dx));
      const y = Math.max(70, Math.min(height - SIZE - 100, origin.current.y + gesture.dy));
      animated.setValue({ x, y });
      position.current = { x, y };
    },
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) router.push("/assistente");
    },
  }), [animated, height, width]);

  return <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Abrir Ajuda Andrade Energy; arraste para mover" style={[styles.button, { transform: animated.getTranslateTransform() }]}>
    <Ionicons name="sunny" size={23} color="#F6C94B" />
    <Ionicons name="flash" size={13} color="white" style={styles.flash} />
  </Animated.View>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, zIndex: 50, width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: "#075E42", borderWidth: 1, borderColor: "#D2B24A", alignItems: "center", justifyContent: "center", elevation: 5 },
  flash: { position: "absolute", right: 8, bottom: 7 },
});
