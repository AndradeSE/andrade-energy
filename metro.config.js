const { getDefaultConfig } = require("expo/metro-config");
const fs = require("node:fs");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Worktrees podem compartilhar dependências por uma junction no Windows.
// O Metro precisa enxergar o destino e resolver também os imports do app nele.
const dependencies = path.join(__dirname, "node_modules");
if (fs.existsSync(dependencies)) {
  const realDependencies = fs.realpathSync(dependencies);
  if (realDependencies.toLowerCase() !== dependencies.toLowerCase()) {
    config.watchFolders = [...(config.watchFolders || []), realDependencies];
    config.resolver.nodeModulesPaths = [dependencies, realDependencies];
    config.resolver.extraNodeModules = {
      ...(config.resolver.extraNodeModules || {}),
      "decode-uri-component": path.join(__dirname, "vendor/decode-uri-component"),
    };
  }
}

// Artefatos locais grandes não fazem parte do aplicativo. Além de acelerar o
// bundle, isto evita falhas EPERM ao Metro percorrer ferramentas de vídeo.
config.resolver.blockList = [
  /[/\\]tmp[/\\].*/,
  /[/\\]output[/\\].*/,
  /[/\\]\.codex-[^/\\]*[/\\].*/,
  /[/\\]dist-gerador[/\\].*/,
];

module.exports = config;
