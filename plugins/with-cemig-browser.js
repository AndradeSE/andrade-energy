const {withAndroidManifest,withDangerousMod,withAppBuildGradle}=require('expo/config-plugins');
const fs=require('node:fs');
const path=require('node:path');
function configureManifest(m,enabled,permissions=[]){
  const app=m.application[0];app.activity??=[];app.service??=[];
  const activity='br.com.andradeenergy.cemig.CemigBrowserActivity';
  const service='br.com.andradeenergy.cemig.CemigBrowserService';
  app.activity=app.activity.filter(a=>a.$?.['android:name']!==activity);
  app.service=app.service.filter(a=>a.$?.['android:name']!==service);
  app.provider=(app.provider??[]).filter(p=>p.$?.['android:authorities']!=='${applicationId}.cemig.preview.files');
  if(!enabled){
   const explicit=permissions.some(p=>String(p).replace('android.permission.','')==='FOREGROUND_SERVICE_DATA_SYNC');
   const used=app.service.some(s=>String(s.$?.['android:foregroundServiceType']??'').split('|').includes('dataSync'));
   if(!explicit&&!used)m['uses-permission']=(m['uses-permission']??[]).filter(p=>p.$?.['android:name']!=='android.permission.FOREGROUND_SERVICE_DATA_SYNC');
   return m;
  }
  m['uses-permission']??=[];
  for(const permission of ['android.permission.FOREGROUND_SERVICE','android.permission.FOREGROUND_SERVICE_DATA_SYNC']){
   if(!m['uses-permission'].some(p=>p.$?.['android:name']===permission))m['uses-permission'].push({$:{'android:name':permission}});
  }
  app.activity.push({$:{'android:name':activity,'android:exported':'false','android:launchMode':'singleTask','android:windowSoftInputMode':'adjustResize','android:theme':'@android:style/Theme.Material.Light.NoActionBar','android:configChanges':'orientation|screenSize|keyboardHidden'}});
  app.service.push({$:{'android:name':service,'android:exported':'false','android:foregroundServiceType':'dataSync','android:stopWithTask':'false'}});
  app.service=app.service.filter(s=>s.$?.['android:name']!=='androidx.work.impl.foreground.SystemForegroundService');
  app.service.push({$:{'android:name':'androidx.work.impl.foreground.SystemForegroundService','android:foregroundServiceType':'dataSync','tools:node':'merge'}});
  m.$??={};m.$['xmlns:tools']='http://schemas.android.com/tools';
  app.provider.push({$:{'android:name':'br.com.andradeenergy.cemig.CemigCsvProvider','android:authorities':'${applicationId}.cemig.preview.files','android:exported':'false','android:grantUriPermissions':'true'},'meta-data':[{$:{'android:name':'android.support.FILE_PROVIDER_PATHS','android:resource':'@xml/cemig_preview_paths'}}]});
  return m;
}
module.exports=function withCemigBrowser(config){
 const enabled=config.extra?.nativeCemigBrowser===true;
 config=withAppBuildGradle(config,c=>{
  if(enabled&&!c.modResults.contents.includes('androidx.work:work-runtime-ktx'))c.modResults.contents+='\n// Native rateio scheduling survives normal process/device restarts.\ndependencies { implementation("androidx.work:work-runtime-ktx:2.10.1") }\n';
  if(enabled&&!c.modResults.contents.includes('com.google.guava:guava:'))c.modResults.contents+='\ndependencies { implementation("com.google.guava:guava:33.4.8-android") }\n';
  return c;
 });
 config=withAndroidManifest(config,c=>{
  c.modResults.manifest=configureManifest(c.modResults.manifest,enabled,config.android?.permissions);
  return c;
 });
 return withDangerousMod(config,['android',async c=>{
  const root=path.resolve(c.modRequest.platformProjectRoot);
  const dest=path.resolve(root,'app/src/main/java/br/com/andradeenergy/cemig');
  if(!dest.startsWith(root+path.sep))throw new Error('Destino nativo fora do projeto Android');
  if(enabled)fs.mkdirSync(dest,{recursive:true});
  const paths=path.join(root,'app/src/main/res/xml/cemig_preview_paths.xml');
  if(enabled){fs.mkdirSync(path.dirname(paths),{recursive:true});fs.writeFileSync(paths,'<?xml version="1.0" encoding="utf-8"?><paths xmlns:android="http://schemas.android.com/apk/res/android"><cache-path name="rateio" path="cemig-preview/"/></paths>');}
  else if(fs.existsSync(paths))fs.unlinkSync(paths);
  for(const name of ['CemigBrowserActivity.kt','CemigBrowserService.kt','CemigCsvProvider.kt','CemigNativeAccess.kt','CemigAutomationStore.kt','CemigAutomationWorker.kt']){
   const target=path.join(dest,name);
   if(enabled)fs.copyFileSync(path.join(__dirname,'cemig-browser',name),target);
   else if(fs.existsSync(target))fs.unlinkSync(target);
  }
  if(enabled){const assets=path.join(root,'app/src/main/assets');fs.mkdirSync(assets,{recursive:true});for(const file of ['navigation','login','captcha','submit'])fs.copyFileSync(path.join(__dirname,`cemig-browser/rateio-${file}.js`),path.join(assets,`cemig-rateio-${file}.js`));}
  return c;
 }]);
};
module.exports.configureManifest=configureManifest;
