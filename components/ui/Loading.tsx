import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing } from "../../theme";

export default function Loading() {
  const pulso = useRef(new Animated.Value(0)).current;
  const fluxo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(fluxo, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animacao.start();
    return () => animacao.stop();
  }, [fluxo, pulso]);

  return (
    <View accessibilityLabel="Carregando dados" style={styles.container}>
      <View style={styles.animation}>
        <Animated.View style={[styles.pulse, {
          opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0] }),
          transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.35] }) }],
        }]} />
        <View style={styles.energyCore}><Ionicons name="flash" size={30} color="#FFFFFF" /></View>
      </View>
      <Text style={styles.title}>Andrade Energy</Text>
      <Text style={styles.subtitle}>Carregando sua energia</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.flow, { transform: [{ translateX: fluxo.interpolate({ inputRange: [0, 1], outputRange: [-82, 82] }) }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", padding: Spacing.xl, backgroundColor: Colors.background },
  animation: { width: 94, height: 94, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: 86, height: 86, borderRadius: 43, backgroundColor: Colors.primary },
  energyCore: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 29, backgroundColor: Colors.primary, shadowColor: Colors.primaryDark, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  title: { marginTop: Spacing.sm, color: Colors.primaryDark, fontSize: 18, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { marginTop: 4, color: Colors.subtitle, fontSize: 12, fontWeight: "600" },
  track: { width: 116, height: 4, overflow: "hidden", marginTop: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  flow: { width: 42, height: 4, borderRadius: Radius.round, backgroundColor: Colors.primary },
});
