import assert from "node:assert/strict";
import { test } from "node:test";
import { availableNativeApk } from "./native-apk-release";

for (const variant of ["gerador", "consumidor"]) for (const preview of [false, true]) {
  test(`APK notice isolates ${variant} ${preview ? "Preview" : "production"} and ignores OTA`, () => {
    const id = `com.andradese.energy.${variant}${preview ? ".preview" : ""}`;
    const release = { applicationId: id, build: preview ? 3 : 10, bytes: 74260580, md5: "a".repeat(32),
      url: `https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-${variant}${preview ? "-preview" : ""}.apk` };
    assert.ok(availableNativeApk(release, id, "1"));
    assert.equal(availableNativeApk(release, id, String(release.build)), null);
    assert.equal(availableNativeApk(release, id, "99"), null);
    assert.equal(availableNativeApk(release, id, null), null);
    assert.equal(availableNativeApk({ ...release, url: "https://evil.test/app.apk" }, id, "1"), null);
    assert.equal(availableNativeApk(release, "com.other.app", "1"), null);
    assert.equal(availableNativeApk({ ...release, build: "10" }, id, "1"), null);
    assert.equal(availableNativeApk({ ...release, bytes: 0 }, id, "1"), null);
    assert.equal(availableNativeApk({ ...release, md5: "invalid" }, id, "1"), null);
  });
}
