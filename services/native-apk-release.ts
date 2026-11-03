export type NativeApkRelease = { applicationId: string; build: number; url: string; bytes: number; md5: string };

// Compare the installed Android versionCode, never the OTA revision/runtime.
export function availableNativeApk(value: unknown, applicationId: string, installed: string | null): NativeApkRelease | null {
  const release = value as NativeApkRelease | null;
  const build = Number(installed);
  if (!release || release.applicationId !== applicationId || !/^\d+$/.test(installed ?? "") ||
      !Number.isSafeInteger(build) || !Number.isSafeInteger(release.build) || release.build <= build ||
      !Number.isSafeInteger(release.bytes) || release.bytes <= 0 || !/^[a-f0-9]{32}$/.test(release.md5 ?? "")) return null;
  const name = applicationId.endsWith(".preview") ? `${applicationId.split(".")[3]}-preview` : applicationId.split(".")[3];
  const expected = `https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-${name}.apk`;
  return release.url === expected ? release : null;
}
