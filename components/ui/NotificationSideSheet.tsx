import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Modal, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Full-screen notification inbox that enters from the right edge. */
export default function NotificationSideSheet({ visible, onClose, children }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const offset = useRef(new Animated.Value(width)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      offset.setValue(width);
      return;
    }
    if (!mounted) return;
    Animated.timing(offset, { toValue: width, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, width]);

  // No Android, a animação iniciada antes do Modal aparecer pode terminar
  // fora da tela. onShow garante que o deslizamento seja visto pelo usuário.
  return <Modal animationType="none" visible={mounted} onShow={() => {
    if (visible) Animated.timing(offset, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }} onRequestClose={onClose} statusBarTranslucent>
    <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
    <View style={styles.canvas}>
      <Animated.View style={[styles.sheet, { paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: offset }] }]}>{children}</Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#FFFFFF" },
  sheet: { flex: 1, width: "100%", backgroundColor: "#FFFFFF" },
});
