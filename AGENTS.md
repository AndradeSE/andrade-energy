# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Mobile release safeguards

- Before mobile release, read docs/mobile-release-baseline.md in branch codex/gerador-share-release-20261113. Do not reconstruct a release from an older consumer/production worktree.
- Run scripts/check-consumer-release.cjs with EXPO_PUBLIC_APP_VARIANT=consumidor before every Consumer OTA or APK. Never update baseline hashes just to bypass a failed check; review the diff against approved Preview behavior first.
- The six restored Consumer screens must remain in the embedded APK as well as OTA. Verify rural meter-reading action on Home, compact UC switch, collapsed details, and logo startup before promoting UI changes.
- Preserve legacy Consumer OTA runtimes until migration is confirmed. Validate project, channel, runtime, package, signing certificate, monotonically increasing versionCode and download hashes before publishing an APK update notice.
