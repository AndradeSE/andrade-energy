const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function withShareInbox(config) {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0];
    const name = "br.com.andradeenergy.share.ShareInboxActivity";
    app.activity = (app.activity ?? []).filter(activity => activity.$["android:name"] !== name);
    app.activity.push({
      $: { "android:name": name, "android:exported": "true", "android:excludeFromRecents": "true" },
      "intent-filter": [{
        action: [{ $: { "android:name": "android.intent.action.SEND" } }],
        category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
        data: ["application/pdf", "image/jpeg", "image/png"].map(type => ({ $: { "android:mimeType": type } })),
      }],
    });
    return mod;
  });
  return withDangerousMod(config, ["android", mod => {
    const target = path.join(mod.modRequest.platformProjectRoot, "app/src/main/java/br/com/andradeenergy/share");
    fs.mkdirSync(target, { recursive: true });
    fs.copyFileSync(path.join(__dirname, "share-inbox/ShareInboxActivity.kt"), path.join(target, "ShareInboxActivity.kt"));
    return mod;
  }]);
};
