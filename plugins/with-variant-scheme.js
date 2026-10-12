const { withAndroidManifest } = require("expo/config-plugins");

// Repeated prebuilds preserve old intent filters. Remove routes owned by a
// different app, including stale package-visibility queries.
function isolateVariantSchemes(node, scheme) {
  if (Array.isArray(node)) return node.map((item) => isolateVariantSchemes(item, scheme)).filter((item) => item !== null);
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node.data)) {
    const ownedOnly = node.data.length > 0 && node.data.every((item) => String(item.$?.["android:scheme"] ?? "").startsWith("andradeenergy"));
    const seen = new Set();
    node.data = node.data.filter((item) => {
      const value = String(item.$?.["android:scheme"] ?? "");
      if (!value.startsWith("andradeenergy")) return true;
      if (value !== scheme) return false;
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (ownedOnly && node.data.length === 0) return null;
  }
  for (const key of Object.keys(node)) {
    if (key !== "$" && key !== "data") node[key] = isolateVariantSchemes(node[key], scheme);
  }
  return node;
}

module.exports = (config) => withAndroidManifest(config, (mod) => {
  const scheme = config.android?.scheme ?? config.scheme;
  if (typeof scheme !== "string" || !/^andradeenergy(consumidor|gerador)(preview)?$/.test(scheme)) throw new Error("Invalid Andrade app scheme");
  mod.modResults = isolateVariantSchemes(mod.modResults, scheme);
  return mod;
});
module.exports.isolateVariantSchemes = isolateVariantSchemes;
