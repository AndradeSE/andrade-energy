import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Props = { value: string[]; onChange: (paths: string[]) => void };

export default function SignaturePad({ value, onChange }: Props) {
  const [current, setCurrent] = useState("");
  const currentRef = useRef("");
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      currentRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      currentRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onPanResponderRelease: () => {
      if (currentRef.current.length > 12) onChange([...value, currentRef.current]);
      currentRef.current = "";
      setCurrent("");
    },
  }), [onChange, value]);

  return <View>
    <View style={styles.pad} {...pan.panHandlers}>
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
