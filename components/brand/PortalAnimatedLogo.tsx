import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Defs, G, Image, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

const AnimatedGroup = Animated.createAnimatedComponent(G);

// Mesmo desenho, trajetória da folha e tempos do AnimatedLogo do portal.
export default function PortalAnimatedLogo({ animate = true, onReady }: { animate?: boolean; onReady?: () => void }) {
  const entrance = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const leaf = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const bulb = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    let pulse: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      const startPulse = () => {
        ready.current?.();
        if (reduced) return;
        pulse = Animated.loop(Animated.sequence([
          Animated.delay(750),
          Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 1450, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]));
        pulse.start();
      };
      if (!animate || reduced) {
        entrance.setValue(1); leaf.setValue(1); bulb.setValue(1);
        startPulse();
        return;
      }
      animation = Animated.parallel([
        Animated.timing(entrance, { toValue: 1, duration: 900, easing: Easing.bezier(.2,.8,.2,1), useNativeDriver: false }),
        Animated.sequence([Animated.delay(650), Animated.timing(leaf, { toValue: 1, duration: 2500, easing: Easing.bezier(.34,.04,.18,1), useNativeDriver: false })]),
        Animated.sequence([Animated.delay(3350), Animated.timing(bulb, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false })]),
      ]);
      animation.start(({ finished }) => { if (finished && active) startPulse(); });
    }).catch(() => { entrance.setValue(1); leaf.setValue(1); bulb.setValue(1); if (active) ready.current?.(); });
    return () => { active = false; animation?.stop(); pulse?.stop(); };
  }, [animate, bulb, entrance, glow, leaf]);

  const frames = [0,.38,.62,.82,1];
  const leafTransform = [{ translateX: leaf.interpolate({ inputRange: frames, outputRange: [-135,18,82,14,0] }) },
    { translateY: leaf.interpolate({ inputRange: frames, outputRange: [42,-112,-38,8,0] }) },
    { rotate: leaf.interpolate({ inputRange: frames, outputRange: ["-165deg","-82deg","28deg","-8deg","0deg"] }) },
    { scale: leaf.interpolate({ inputRange: frames, outputRange: [.2,.58,.84,1.04,1] }) }];
  const lighting = glow.interpolate({ inputRange: [0,1], outputRange: [.64,1] });
  const canvas = { position: "absolute" as const, left: 0, top: 0, width: 790, height: 220 };
  return <View accessibilityLabel="Andrade Energy" style={{ width: 280, height: 78 }}>
    <Animated.View style={{ width: 790, height: 220, position: "absolute", left: (280-790)/2, top: (78-220)/2,
      opacity: entrance, transform: [{ scale: 280/790 }, { translateX: entrance.interpolate({ inputRange: [0,.65,1], outputRange: [-24,4,0] }) }] }}>
      <Svg viewBox="0 0 790 220" width={790} height={220}>
        <Path d="M26 179 C35 72 96 31 153 34 C202 36 229 72 235 127" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeWidth={17} />
        <Path d="M45 190 L142 18 L237 190 L194 190 L142 94 L89 190 Z" fill="#06255A" />
        <SvgText fill="#06255A" fontSize={88} fontWeight="800" letterSpacing={-4} x={255} y={132}>NDRADE</SvgText>
        <SvgText fill="#25D17F" fontSize={35} fontWeight="700" letterSpacing={15} x={338} y={191}>ENERGY</SvgText>
        <AnimatedGroup opacity={lighting}>
          <Path d="M258 180 H318 M580 180 H645 C660 180 662 172 651 169 C639 166 638 160 650 157 L650 153" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={7} />
        </AnimatedGroup>
      </Svg>
      <Animated.View style={[{ position: "absolute", left: 0, top: 120, width: 276, height: 90 }, { opacity: leaf.interpolate({ inputRange: [0,.16,1], outputRange: [0,1,1] }), transform: leafTransform }]}>
        <Svg viewBox="0 120 276 90" width={276} height={90}>
          <Defs><LinearGradient id="startupLeaf" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#5CF2A7" /><Stop offset=".48" stopColor="#20CF7A" /><Stop offset="1" stopColor="#079454" /></LinearGradient></Defs>
          <Path d="M25 184 C74 176 102 147 141 134 C183 120 226 128 276 151 C224 144 190 150 151 172 C109 196 65 204 25 184 Z" fill="url(#startupLeaf)" />
          <Path d="M42 184 C93 179 139 160 194 145 C219 138 242 142 263 149" fill="none" stroke="#ECFFF5" strokeOpacity={.68} strokeWidth={2.3} />
          <Path d="M108 174 C113 161 121 151 134 139 M157 158 C164 145 174 137 187 132" fill="none" stroke="#ECFFF5" strokeOpacity={.34} strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      <Animated.View style={[canvas, { opacity: bulb, transform: [{ translateY: bulb.interpolate({ inputRange: [0,1], outputRange: [7,0] }) }] }]}>
        <Svg viewBox="0 0 790 220" width={790} height={220}>
          <AnimatedGroup opacity={lighting}><Image x={613.4} y={37.4} width={117.3} height={117.3} href={require("../../portal-web/src/assets/lampada-dourada.png")} /></AnimatedGroup>
        </Svg>
      </Animated.View>
    </Animated.View>
  </View>;
}
