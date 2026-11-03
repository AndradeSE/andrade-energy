import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View, type ScrollViewProps } from "react-native";

/** Observa o gesto sem capturar o responder ou montar SwipeRefreshLayout. */
export function useAndroidPullRefresh(onRefresh?: (() => void) | null, refreshing?: boolean | null, props: ScrollViewProps = {}) {
  const top = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const distance = useRef(0);
  const last = useRef(0);
  const [pull, setPull] = useState(0);
  const enabled = Platform.OS === "android" && Boolean(onRefresh);
  const handlers: ScrollViewProps = enabled ? {
    scrollEventThrottle: 16,
    onScroll: event => { top.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); },
    onTouchStart: event => { start.current = top.current <= 1 ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : null; distance.current = 0; props.onTouchStart?.(event); },
    onTouchMove: event => {
      const origin = start.current;
      if (origin) {
        const dy = event.nativeEvent.pageY - origin.y;
        const dx = Math.abs(event.nativeEvent.pageX - origin.x);
        distance.current = dy > dx * 1.5 ? Math.max(0, dy) : 0;
        setPull(Math.min(100, distance.current));
      }
      props.onTouchMove?.(event);
    },
    onTouchEnd: event => {
      if (distance.current >= 80 && !refreshing && Date.now() - last.current > 1500) { last.current = Date.now(); onRefresh?.(); }
      start.current = null; distance.current = 0; setPull(0); props.onTouchEnd?.(event);
    },
    onTouchCancel: event => { start.current = null; distance.current = 0; setPull(0); props.onTouchCancel?.(event); },
  } : {};
  const indicator = enabled && (refreshing || pull > 12) ? <View accessibilityLiveRegion="polite" style={{ alignItems: "center", padding: 10 }}>{refreshing ? <ActivityIndicator color="#087A46" /> : <Text style={{ color: "#087A46" }}>{pull >= 80 ? "Solte para atualizar" : "Puxe para atualizar"}</Text>}</View> : null;
  return { handlers, indicator };
}
