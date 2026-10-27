const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const fs = require('fs');
const path = require('path');
const modules = fs.realpathSync(path.join(__dirname, 'node_modules'));
if (modules !== path.join(__dirname, 'node_modules')) {
  config.watchFolders = [...(config.watchFolders || []), modules, path.join(path.dirname(modules), 'vendor')];
  config.resolver.nodeModulesPaths = [modules, path.join(__dirname, 'node_modules')];
  config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), '@babel/runtime': path.join(modules, '@babel/runtime') };
}
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
