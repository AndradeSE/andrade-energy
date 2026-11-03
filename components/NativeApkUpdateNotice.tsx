import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { availableNativeApk } from "../services/native-apk-release";
import { installNativeApk } from "../services/native-apk-install";

export default function NativeApkUpdateNotice() {
  const checking = useRef(false);
  const prompted = useRef<number | null>(null);
  const installing = useRef(false);
  const downloadController = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    const id = Application.applicationId;
    if (Platform.OS !== "android" || !id || !/^com\.andradese\.energy\.(gerador|consumidor)(\.preview)?$/.test(id)) return;
    let active = true;
    const check = async () => {
      if (checking.current || installing.current) return;
      checking.current = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/${id}.json?t=${Date.now()}`, { signal: controller.signal });
        if (!response.ok) return;
        const release = availableNativeApk(await response.json(), id, Application.nativeBuildVersion);
        if (!active || !release || prompted.current === release.build) return;
        prompted.current = release.build;
        Alert.alert("Nova versão do aplicativo", "Esta atualização precisa de um novo APK. Toque em Atualizar aplicativo para baixar. Depois, confirme a instalação no Android; seus dados serão mantidos.", [
          { text: "Depois", style: "cancel" },
          { text: "Atualizar aplicativo", onPress: () => {
            if (installing.current) return;
            installing.current = true;
            const download = new AbortController();
            downloadController.current = download;
            setProgress(0);
            void installNativeApk(release, id, Application.nativeBuildVersion, value => { if (active) setProgress(value); }, download.signal).catch(error => {
              prompted.current = null;
              if (active && !download.signal.aborted) Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Confira a conexão e tente novamente.");
            }).finally(() => { installing.current = false; downloadController.current = null; if (active) setProgress(null); });
          } },
        ]);
      } catch { /* Offline checks must never block startup or sign-in. */ }
      finally { clearTimeout(timeout); checking.current = false; }
    };
    // Non-blocking: let the initial screen/biometric transition settle first.
    const timer = setTimeout(() => { void check(); }, 4000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    return () => { active = false; downloadController.current?.abort(); clearTimeout(timer); subscription.remove(); };
  }, []);
  return <Modal visible={progress !== null} transparent animationType="fade" onRequestClose={() => downloadController.current?.abort()}>
    <View style={styles.backdrop}><View style={styles.card}>
      <ActivityIndicator size="large" color="#00894F" />
      <Text style={styles.title}>{progress === 100 ? "Abrindo instalador…" : "Baixando atualização"}</Text>
      <Text>{progress === 100 ? "Confirme a instalação na tela do Android." : `${progress ?? 0}% — aguarde o download terminar.`}</Text>
      {progress !== 100 ? <Pressable accessibilityRole="button" onPress={() => downloadController.current?.abort()}><Text style={{ color: "#00894F", padding: 12 }}>Cancelar</Text></Pressable> : null}
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 28 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 28, gap: 18, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#124936" },
});
