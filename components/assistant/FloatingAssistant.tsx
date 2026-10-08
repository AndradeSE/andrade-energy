import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Alert, Animated, Image, PanResponder, StyleSheet, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_TAB_BAR_METRICS } from "../navigation/AppTabBarFrame";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";
import { subscribeWakeWord, wakeWordEnabled, wakeWordPaused, wakeWordReady } from "../../services/assistant-wake-word";
import { closeFloatingConversation, floatingConversationRequest, subscribeFloatingConversation } from "../../services/assistant-floating-conversation";
import Assistente from "../../app/assistente";
import { setWakeWordPaused } from "../../services/assistant-wake-word";
import { floatingHidden, loadFloatingPreference, setFloatingHidden, subscribeFloatingHidden } from "../../services/assistant-floating-preference";
import { useAuth } from "../../contexts/AuthContext";

const SIZE = 54;
let savedPosition: { x: number; y: number } | undefined;

export default function FloatingAssistant() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const conversationRequest = useSyncExternalStore(subscribeFloatingConversation, floatingConversationRequest);
  const conversationOpen = Boolean(conversationRequest);
  const { usuario } = useAuth();
  const userId = usuario?.id ? String(usuario.id) : "";
  const hidden = useSyncExternalStore(subscribeFloatingHidden, floatingHidden);
  useEffect(() => { if (userId) void loadFloatingPreference(userId); }, [userId]);
  const wave = useRef(new Animated.Value(0)).current;
  const hideProgress = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressed = useRef(false);
  const previousHidden = useRef(hidden);
  useEffect(() => {
    if (previousHidden.current && !hidden) {
      hideProgress.setValue(1);
      Animated.timing(hideProgress, { toValue: 0, duration: 360, useNativeDriver: true }).start();
    }
    previousHidden.current = hidden;
  }, [hidden, hideProgress]);
  useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }, []);
  useEffect(() => {
    wave.setValue(0);
    if (!conversationOpen || loading) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [conversationOpen, loading, wave]);
  const position = useRef(savedPosition ?? { x: Math.max(0, width - SIZE - 12), y: Math.max(0, height - insets.bottom - APP_TAB_BAR_METRICS.height - SIZE - 12) });
  const origin = useRef({ ...position.current });
  const animated = useRef(new Animated.ValueXY(position.current)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const x = Math.max(0, Math.min(width - SIZE, position.current.x));
    const y = Math.max(0, Math.min(height - SIZE, position.current.y));
    position.current = { x, y };
    savedPosition = { x, y };
    animated.setValue({ x, y });
  }, [animated, height, width]);
  useEffect(() => {
    const float = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    float.start();
    return () => float.stop();
  }, [breathe]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      origin.current = { ...position.current };
      longPressed.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressed.current = true;
        Alert.alert("Ícone da Ajuda", "Ocultar o ícone flutuante? Ele ficará disponível em Acesso rápido na Home.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Ocultar", onPress: () => {
            Animated.timing(hideProgress, { toValue: 1, duration: 360, useNativeDriver: true }).start(({ finished }) => {
              if (finished) void setFloatingHidden(userId, true);
            });
          } },
        ]);
      }, 550);
    },
    onPanResponderMove: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      }
      const x = Math.max(0, Math.min(width - SIZE, origin.current.x + gesture.dx));
      const y = Math.max(0, Math.min(height - SIZE, origin.current.y + gesture.dy));
      animated.setValue({ x, y });
      position.current = { x, y };
      savedPosition = { x, y };
    },
    onPanResponderRelease: (_event, gesture) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
      if (longPressed.current) return;
      if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
        if (conversationOpen) { setWakeWordPaused(true); closeFloatingConversation(); }
        else router.push("/assistente");
      }
    },
    onPanResponderTerminate: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); longPressTimer.current = undefined; },
  }), [animated, conversationOpen, height, hideProgress, userId, width]);

  if (loading || pathname === "/assistente") return null;
  return <>
  {conversationRequest ? <Assistente voiceOnly embeddedVoiceWake={conversationRequest} onClose={() => { setWakeWordPaused(true); closeFloatingConversation(); }} /> : null}
  {!hidden ? <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel={conversationOpen ? "Conversa por voz aberta; segure para ocultar" : "Abrir Ajuda Andrade Energy; arraste ou segure para ocultar"} style={[styles.button, { opacity: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [...animated.getTranslateTransform(), { translateX: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) }, { translateY: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -170] }) }, { scale: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) }] }]}>
    <Animated.View pointerEvents="none" style={[styles.halo, { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }] }]} />
    <Animated.View pointerEvents="none" style={{ transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }) }, { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }}>
      <Image source={require("../../assets/images/assistant-chat-3d-v2.png")} style={styles.chat} resizeMode="contain" />
      {conversationOpen ? <View style={styles.dotWave} pointerEvents="none">{[0, 1, 2].map(index => <Animated.View key={index} style={[styles.dotBar, { transform: [{ scaleY: wave.interpolate({ inputRange: [0, 1], outputRange: index === 1 ? [1, 2.5] : [2.2, 1] }) }] }]} />)}</View> : null}
    </Animated.View>
  </Animated.View> : null}
  </>;
}

const styles = StyleSheet.create({
  conversationPanel: { position: "absolute", left: 12, right: 12, zIndex: 80, elevation: 12, borderRadius: 22, backgroundColor: "transparent", shadowColor: "#102D21", shadowOpacity: 0.25, shadowRadius: 14 },
  button: { position: "absolute", left: 0, top: 0, zIndex: 90, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", elevation: 15 },
  chat: { width: 64, height: 64 },
  dotWave: { position: "absolute", left: 18, top: 26, flexDirection: "row", alignItems: "center", gap: 1 },
  dotBar: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFF9E9" },
  halo: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: "#16B778", shadowColor: "#B6DB5C", shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
});
