import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { availableNativeApk, NativeApkRelease } from "./native-apk-release";

export async function installNativeApk(release: NativeApkRelease, applicationId: string, installed: string | null, progress: (value: number) => void, signal?: AbortSignal) {
  const ensureActive = () => { if (signal?.aborted) throw new Error("Download cancelado."); };
  ensureActive();
  if (!availableNativeApk(release, applicationId, installed) || !FileSystem.cacheDirectory) throw new Error("Informações da atualização inválidas.");
  const path = `${FileSystem.cacheDirectory}${applicationId}-${release.build}.apk`;
  let info = await FileSystem.getInfoAsync(path, { md5: true });
  if (!info.exists || info.size !== release.bytes || info.md5 !== release.md5) {
    const task = FileSystem.createDownloadResumable(release.url, path, {}, data => {
      progress(Math.min(99, Math.round(data.totalBytesWritten * 100 / release.bytes)));
    });
    const cancel = () => { void task.cancelAsync().catch(() => {}); };
    signal?.addEventListener("abort", cancel, { once: true });
    let result;
    try { ensureActive(); result = await task.downloadAsync(); }
    finally { signal?.removeEventListener("abort", cancel); }
    ensureActive();
    if (!result || result.status !== 200) throw new Error("Não foi possível concluir o download do APK.");
    info = await FileSystem.getInfoAsync(path, { md5: true });
  }
  if (!info.exists || info.size !== release.bytes || info.md5 !== release.md5) {
    await FileSystem.deleteAsync(path, { idempotent: true });
    throw new Error("O arquivo baixado está incompleto. Tente novamente.");
  }
  progress(100);
  const content = await FileSystem.getContentUriAsync(path);
  ensureActive();
  // Grant temporary read access to this APK only. Android validates the package
  // signature and requests the user's installation/source authorization itself.
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: content, type: "application/vnd.android.package-archive", flags: 1,
  });
}
