import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing } from "../../theme";

export default function Loading({ showRevision = false }: { showRevision?: boolean }) {
  const version = Constants.expoConfig?.version ?? Updates.runtimeVersion ?? "1.0.0";
  const revision = Updates.updateId?.slice(-8) ?? "APK";
  const fluxo = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.timing(fluxo, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    animacao.start();
    Animated.timing(entrada, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => animacao.stop();
  }, [entrada, fluxo]);

  return (
    <View accessibilityLabel="Carregando dados" style={styles.container}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <Animated.View style={[styles.brandFrame, { opacity: entrada, transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        <Image accessibilityLabel="Andrade Energy" resizeMode="contain" source={require("../../assets/images/andrade-portal-logo-final.png")} style={styles.brandLogo} />
      </Animated.View>
      <Text style={styles.subtitle}>Carregando sua energia</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.flow, { transform: [{ translateX: fluxo.interpolate({ inputRange: [0, 1], outputRange: [-82, 82] }) }] }]} />
      </View>
      {showRevision && <Text style={styles.revision}>{`v${version} · revisão ${revision}`}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignSelf: "stretch", minHeight: 320, width: "100%", alignItems: "center", justifyContent: "center", padding: Spacing.xl, backgroundColor: Colors.background },
  glowTop: { position: "absolute", top: 16, right: 16, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(16,185,129,0.15)" },
  glowBottom: { position: "absolute", bottom: 16, left: 16, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(250,204,21,0.12)" },
  brandFrame: { backgroundColor: "#07533D", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  brandLogo: { width: 250, height: 70 },
  subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: 12, fontWeight: "600" },
  track: { width: 116, height: 4, overflow: "hidden", marginTop: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.primaryLight },
  flow: { width: 42, height: 4, borderRadius: Radius.round, backgroundColor: Colors.primary },
  revision: { marginTop: 16, color: Colors.subtitle, opacity: 0.65, fontSize: 10, letterSpacing: 0.2 },
});
