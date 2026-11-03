const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Backport upstream screens PR #4519: preserve the progress circle's child index.
module.exports = config => withDangerousMod(config, ['android', async mod => {
  const root = path.dirname(require.resolve('react-native-screens/package.json', { paths: [mod.modRequest.projectRoot] }));
  const file = path.join(root, 'android/src/main/java/com/swmansion/rnscreens/Screen.kt');
  const original = fs.readFileSync(file, 'utf8');
  if (original.includes('ANDRADE_REFRESH_TRANSITION_FIXED')) return mod;
  const needle = 'it.addView(View(context), i)';
  if (!original.includes(needle)) throw new Error('Revisar backport RefreshControl: Screen.kt mudou.');
  fs.writeFileSync(file, original.replace(needle, 'it.addView(View(context)) // ANDRADE_REFRESH_TRANSITION_FIXED: upstream #4519'));
  return mod;
}]);
