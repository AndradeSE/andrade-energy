// The offline LLM engine ships only 64-bit Android libraries.
module.exports = process.env.ANDRADE_ANDROID_32BIT === "1" || process.env.ANDRADE_ANDROID_UNIVERSAL === "1"
  ? { dependencies: { "llama.rn": { platforms: { android: null } } } }
  : {};
