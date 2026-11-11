import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View } from "react-native";

const drops = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37 + 9) % 100,
  top: ((index * 43 + 17) % 100) / 100,
  length: 9 + (index % 5) * 4,
  opacity: .15 + (index % 4) * .08,
}));

/** Transparent rain only; a tiled native transform keeps the loop seamless. */
export default function RainOverlay({ running }: { running: boolean }) {
  const phase = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    const app = AppState.addEventListener("change", value => setActive(value === "active"));
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    return () => { mounted = false; app.remove(); motion.remove(); };
  }, []);
  const animate = running && active && !reduced;
  useEffect(() => {
    if (!animate || !height) { phase.stopAnimation(); phase.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 760, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }));
    loop.start();
    return () => { loop.stop(); phase.setValue(0); };
  }, [animate, height, phase]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.clip}
    onLayout={event => setHeight(event.nativeEvent.layout.height)}>
    {animate && height > 0 ? <Animated.View style={[styles.sheet, { height: height * 2, transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] }]}>
      {[0, 1].map(tile => drops.map((drop, index) => <View key={`${tile}-${index}`} style={[styles.drop,
        { left: `${drop.left}%`, top: (tile + drop.top) * height, height: drop.length, opacity: drop.opacity }]} />))}
    </Animated.View> : null}
  </View>;
}
const styles = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  sheet: { position: "absolute", top: 0, left: 0, right: 0 },
  drop: { position: "absolute", width: 1, borderRadius: 1, backgroundColor: "#E5F5FF", transform: [{ rotate: "12deg" }] },
});