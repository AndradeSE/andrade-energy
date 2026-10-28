const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('new production native runtime is isolated from preview and old APKs',()=>{
 const saved={...process.env};
 try{
  process.env.EXPO_PUBLIC_APP_VARIANT='gerador';process.env.EXPO_PUBLIC_APP_ENV='production';process.env.ANDRADE_NATIVE_CEMIG_BROWSER='1';
  const file=path.join(root,'app.config.js');delete require.cache[require.resolve(file)];
  const {expo}=require(file);
  assert.equal(expo.android.package,'com.andradese.energy.gerador');
  assert.equal(expo.runtimeVersion,'1.0.8-production-cemig-vault');
  assert.equal(expo.extra.nativeCemigBrowser,true);
  assert.equal(expo.updates.requestHeaders['expo-channel-name'],'production-gerador');
  assert.equal(expo.android.versionCode,7);
 }finally{process.env=saved;}
});
test('production entry never imports diagnostic files or changes CSV rows',()=>{
 const s=fs.readFileSync(path.join(root,'components/usinas/CemigNativeBrowserProduction.tsx'),'utf8');
 assert.match(s,/if\(isPreviewEnvironment\|\|/);
 assert.match(s,/rateioCsv:plano.csv/);
 assert.doesNotMatch(s,/DocumentPicker|copiaCsvDiagnostico|99999101128/);
 assert.match(s,/numerosAtuaisConfirmados:config.numeros_confirmados===true/);
});
test('preview final-submission guard remains package-bound, robot still stops at review',()=>{
 const s=fs.readFileSync(path.join(root,'plugins/cemig-browser/CemigBrowserService.kt'),'utf8');
 assert.equal((s.match(/if\(\$\{packageName.endsWith\("\.preview"\)\}&&/g)||[]).length,2);
 const nav=fs.readFileSync(path.join(root,'plugins/cemig-browser/rateio-navigation.js'),'utf8');
 assert.doesNotMatch(nav,/clickUnique\('Solicitar cadastro'\)/);
});
test('acesso efêmero não é descartado em estado de carregamento ou pausa',()=>{
 const s=fs.readFileSync(path.join(root,'plugins/cemig-browser/CemigBrowserService.kt'),'utf8');
 assert.doesNotMatch(s,/else if\(json\.optString\("state"\)!=/);
 assert.match(s,/else if\(json\.optString\("state"\) in setOf\("PRONTO"/);
 assert.match(s,/closed=true;savedAccess=null;nativeToken=""/);
 const activity=fs.readFileSync(path.join(root,'plugins/cemig-browser/CemigBrowserActivity.kt'),'utf8');
 assert.match(activity,/intent.removeExtra\("rateioToken"\)/);
});
