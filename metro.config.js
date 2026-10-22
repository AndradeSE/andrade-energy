const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Evita que a exportação e o emulador disputem toda a memória em PCs de 8 GB.
config.maxWorkers = 2;

// Artefatos locais grandes não fazem parte do aplicativo. Além de acelerar o
// bundle, isto evita falhas EPERM ao Metro percorrer ferramentas de vídeo.
config.resolver.blockList = [
  /[/\\]tmp[/\\].*/,
  /[/\\]output[/\\].*/,
  /[/\\]\.codex-[^/\\]*[/\\].*/,
  /[/\\]dist-gerador[/\\].*/,
];

module.exports = config;
