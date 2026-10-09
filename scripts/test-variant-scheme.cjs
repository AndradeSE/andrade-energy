const assert = require("node:assert/strict");
const { isolateVariantSchemes } = require("../plugins/with-variant-scheme");
const variants = ["consumidor", "gerador", "consumidorpreview", "geradorpreview"];
for (const variant of variants) {
  const scheme = `andradeenergy${variant}`;
  const fixture = { manifest: { application: [{ activity: [{ "intent-filter": [
    { action: [{ $: { "android:name": "android.intent.action.MAIN" } }] },
    { data: [...variants, variant].map((name) => ({ $: { "android:scheme": `andradeenergy${name}` } })) },
    { data: [{ $: { "android:scheme": "https", "android:host": "example.com" } }] },
  ] }] }], queries: [{ intent: variants.map((name) => ({ data: [{ $: { "android:scheme": `andradeenergy${name}` } }] })) }] } };
  const cleaned = isolateVariantSchemes(fixture, scheme);
  const filters = cleaned.manifest.application[0].activity[0]["intent-filter"];
  assert.equal(filters.length, 3);
  assert.deepEqual(filters[1].data, [{ $: { "android:scheme": scheme } }]);
  assert.equal(filters[2].data[0].$["android:scheme"], "https");
  assert.deepEqual(cleaned.manifest.queries[0].intent, [{ data: [{ $: { "android:scheme": scheme } }] }]);
  const original = JSON.stringify(cleaned);
  assert.equal(JSON.stringify(isolateVariantSchemes(cleaned, scheme)), original);
}
console.log("Schemes isolados nas quatro variantes; queries e HTTPS preservados.");
