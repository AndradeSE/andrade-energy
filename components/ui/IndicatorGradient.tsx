import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { Colors } from "../../theme";

export function IndicatorGradient({ radius }: { radius: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}
