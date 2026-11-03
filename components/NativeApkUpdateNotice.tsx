import { useEffect, useRef } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import * as Application from "expo-application";
import { availableNativeApk } from "../services/native-apk-release";

export default function NativeApkUpdateNotice() {
  const checking = useRef(false);
  const prompted = useRef<number | null>(null);
  useEffect(() => {
    const id = Application.applicationId;
    if (Platform.OS !== "android" || !id || !/^com\.andradese\.energy\.(gerador|consumidor)(\.preview)?$/.test(id)) return;
    let active = true;
    const check = async () => {
      if (checking.current) return;
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
          { text: "Atualizar aplicativo", onPress: () => { void Linking.openURL(release.url).catch(() => {
            prompted.current = null;
            Alert.alert("Não foi possível abrir o download", "Confira sua conexão e abra novamente o aplicativo para tentar outra vez.");
          }); } },
        ]);
      } catch { /* Offline checks must never block startup or sign-in. */ }
      finally { clearTimeout(timeout); checking.current = false; }
    };
    // Non-blocking: let the initial screen/biometric transition settle first.
    const timer = setTimeout(() => { void check(); }, 4000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, []);
  return null;
}
