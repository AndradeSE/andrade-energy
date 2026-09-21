import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Props = { value: string[]; onChange: (paths: string[]) => void };

export default function SignaturePad({ value, onChange }: Props) {
  const [current, setCurrent] = useState("");
  const currentRef = useRef("");
  const originRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 0, height: 190 });
  const localPoint = useCallback((pageX: number, pageY: number) => ({
    x: Math.max(0, Math.min(sizeRef.current.width, pageX - originRef.current.x)),
    y: Math.max(0, Math.min(sizeRef.current.height, pageY - originRef.current.y)),
  }), []);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { locationX, locationY, pageX, pageY } = event.nativeEvent;
      // locationX pode mudar de referência no Android quando o toque passa
      // sobre o SVG/Path. Fixamos a origem absoluta do campo no primeiro toque.
      originRef.current = { x: pageX - locationX, y: pageY - locationY };
      const point = localPoint(pageX, pageY);
      currentRef.current = `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onPanResponderMove: (_event, gestureState) => {
      const point = localPoint(gestureState.moveX, gestureState.moveY);
      currentRef.current += ` L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onPanResponderRelease: () => {
      if (currentRef.current.length > 12) onChange([...value, currentRef.current]);
      currentRef.current = "";
      setCurrent("");
    },
    onPanResponderTerminate: () => {
      currentRef.current = "";
      setCurrent("");
    },
    onPanResponderTerminationRequest: () => false,
  }), [localPoint, onChange, value]);

  return <View>
    <View onLayout={(event) => { sizeRef.current = event.nativeEvent.layout; }} style={styles.pad} {...pan.panHandlers}>
      <Svg width="100%" height="100%">
        {value.map((path, index) => <Path key={`${index}-${path.length}`} d={path} fill="none" stroke={Colors.primaryDark} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />)}
        {current ? <Path d={current} fill="none" stroke={Colors.primaryDark} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </Svg>
      {!value.length && !current ? <Text pointerEvents="none" style={styles.hint}>Assine aqui com o dedo</Text> : null}
      <View pointerEvents="none" style={styles.line} />
    </View>
    <TouchableOpacity disabled={!value.length} onPress={() => onChange([])} style={styles.clear}>
      <Text style={[styles.clearText, !value.length && styles.disabled]}>Limpar assinatura</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  pad: { height: 190, overflow: "hidden", borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: "#FFFFFF" },
  hint: { position: "absolute", alignSelf: "center", top: 80, color: Colors.subtitle, fontSize: Typography.caption },
  line: { position: "absolute", left: Spacing.lg, right: Spacing.lg, bottom: 34, height: 1, backgroundColor: "#94A3B8" },
  clear: { alignSelf: "flex-end", paddingVertical: Spacing.sm },
  clearText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700" },
  disabled: { opacity: 0.4 },
});
