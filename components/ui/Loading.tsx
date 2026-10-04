import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import PortalAnimatedLogo from "../brand/PortalAnimatedLogo";

import { Colors, Radius, Spacing } from "../../theme";

export default function Loading({ showRevision = false, animateBrand = true, onBrandReady }: { showRevision?: boolean; animateBrand?: boolean; onBrandReady?: () => void }) {
  const version = Constants.expoConfig?.version ?? Updates.runtimeVersion ?? "1.0.0";
  const revision = Updates.updateId?.slice(-8) ?? "APK";
  const fluxo = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(Animated.parallel([
      Animated.timing(fluxo, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]));
    animacao.start();
    Animated.timing(entrada, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => animacao.stop();
  }, [entrada, fluxo, pulso]);

  return (
    <View accessibilityLabel="Carregando dados" style={styles.container}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      {showRevision ? <Animated.View style={[styles.brandFrame, { opacity: entrada, transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        <PortalAnimatedLogo animate={animateBrand} onReady={onBrandReady} />
      </Animated.View> : <>
        <View style={styles.animation}>
          <Animated.View style={[styles.pulse, { opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0] }), transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.35] }) }] }]} />
          <View style={styles.energyCore}><Ionicons name="flash" size={30} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.title}>Andrade Energy</Text>
      </>}
      <Text style={styles.subtitle}>Carregando sua energia</Text>
      {!showRevision && <View style={styles.track}>
        <Animated.View style={[styles.flow, { transform: [{ translateX: fluxo.interpolate({ inputRange: [0, 1], outputRange: [-82, 82] }) }] }]} />
      </View>}
      {showRevision && <Text style={styles.revision}>{`v${version} · revisão ${revision}`}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignSelf: "stretch", minHeight: 320, width: "100%", alignItems: "center", justifyContent: "center", padding: Spacing.xl, backgroundColor: Colors.background },
  glowTop: { position: "absolute", top: 16, right: 16, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(16,185,129,0.15)" },
  glowBottom: { position: "absolute", bottom: 16, left: 16, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(250,204,21,0.12)" },
  brandFrame: { paddingVertical: 8 },
  brandLogo: { width: 250, height: 70 },
  animation: { width: 94, height: 94, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: 86, height: 86, borderRadius: 43, backgroundColor: Colors.primary },
  energyCore: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 29, backgroundColor: Colors.primary },
  title: { marginTop: Spacing.sm, color: Colors.primaryDark, fontSize: 18, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: 12, fontWeight: "600" },
  track: { width: 116, height: 4, overflow: "hidden", marginTop: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  flow: { width: 42, height: 4, borderRadius: Radius.round, backgroundColor: Colors.primary },
  revision: { marginTop: 16, color: Colors.subtitle, opacity: 0.65, fontSize: 10, letterSpacing: 0.2 },
});
import { Ionicons } from "@expo/vector-icons";
