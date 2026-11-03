import { useMemo, useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { ActivityIndicator, Platform, Text, View, type ScrollViewProps } from "react-native";

/** Observa o gesto sem capturar o responder ou montar SwipeRefreshLayout. */
export function useAndroidPullRefresh(onRefresh?: (() => void) | null, refreshing?: boolean | null, props: ScrollViewProps = {}) {
  const top = useRef(0);
  const start = useRef(false);
  const distance = useRef(0);
  const last = useRef(0);
  const [pull, setPull] = useState(0);
  const enabled = Platform.OS === "android" && Boolean(onRefresh);
  const callback = useRef(onRefresh);
  const busy = useRef(refreshing);
  callback.current = onRefresh;
  busy.current = refreshing;
  const gesture = useMemo(() => Gesture.Simultaneous(Gesture.Native(), Gesture.Pan().enabled(enabled).runOnJS(true)
    .onBegin(() => { start.current = top.current <= 1; distance.current = 0; })
    .onUpdate(event => {
      if (!start.current) return;
      distance.current = event.translationY > Math.abs(event.translationX) * 1.5 ? Math.max(0, event.translationY) : 0;
      setPull(Math.min(100, distance.current));
    })
    .onEnd(() => {
      if (distance.current >= 80 && !busy.current && Date.now() - last.current > 1500) { last.current = Date.now(); callback.current?.(); }
    })
    .onFinalize(() => { start.current = false; distance.current = 0; setPull(0); })), [enabled]);
  const handlers: ScrollViewProps = enabled ? {
    scrollEventThrottle: 16,
    onScroll: event => { top.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); },
  } : {};
  const indicator = enabled && (refreshing || pull > 12) ? <View accessibilityLiveRegion="polite" style={{ alignItems: "center", padding: 10 }}>{refreshing ? <ActivityIndicator color="#087A46" /> : <Text style={{ color: "#087A46" }}>{pull >= 80 ? "Solte para atualizar" : "Puxe para atualizar"}</Text>}</View> : null;
  return { handlers, indicator, gesture };
}
