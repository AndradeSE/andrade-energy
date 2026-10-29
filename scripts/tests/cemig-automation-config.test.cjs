const test=require('node:test');const assert=require('node:assert/strict');
const {configureManifest}=require('../../plugins/with-cemig-browser');
test('serviço de sessão sobrevive aos recentes sem ficar exportado; configuração é idempotente',()=>{
 const m={application:[{$:{}}]};configureManifest(m,true);configureManifest(m,true);
 const session=m.application[0].service.filter(s=>s.$['android:name']==='br.com.andradeenergy.cemig.CemigBrowserService');
 assert.equal(session.length,1);assert.equal(session[0].$['android:stopWithTask'],'false');assert.equal(session[0].$['android:exported'],'false');
 assert.equal(m.application[0].activity[0].$['android:exported'],'false');
 assert.equal(m['uses-permission'].filter(p=>p.$['android:name']==='android.permission.FOREGROUND_SERVICE_DATA_SYNC').length,1);
});
test('automação experimental não é habilitada por variável em produção ou no consumidor',()=>{
 const saved={...process.env};const file=require.resolve('../../app.config');
 try{for(const [variant,env,enabled] of [['gerador','preview',true],['gerador','production',false],['consumidor','preview',false]]){
  Object.assign(process.env,{EXPO_PUBLIC_APP_VARIANT:variant,EXPO_PUBLIC_APP_ENV:env,ANDRADE_NATIVE_CEMIG_BROWSER:'1',ANDRADE_CEMIG_AUTOMATION_PREVIEW:'1'});delete require.cache[file];
  const {expo}=require(file);assert.equal(expo.extra.nativeCemigAutomation,enabled);if(enabled)assert.equal(expo.runtimeVersion,'1.0.9-preview-cemig-worker');
 }}finally{process.env=saved;delete require.cache[file];}
});
