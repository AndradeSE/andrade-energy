const {withAndroidManifest,withDangerousMod}=require('expo/config-plugins');
const fs=require('node:fs');
const path=require('node:path');
function configureManifest(m,enabled,permissions=[]){
  const app=m.application[0];app.activity??=[];app.service??=[];
  const activity='br.com.andradeenergy.cemig.CemigBrowserActivity';
  const service='br.com.andradeenergy.cemig.CemigBrowserService';
  app.activity=app.activity.filter(a=>a.$?.['android:name']!==activity);
  app.service=app.service.filter(a=>a.$?.['android:name']!==service);
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
  app.service.push({$:{'android:name':service,'android:exported':'false','android:foregroundServiceType':'dataSync','android:stopWithTask':'true'}});
  return m;
}
module.exports=function withCemigBrowser(config){
 const enabled=config.extra?.nativeCemigBrowser===true;
 config=withAndroidManifest(config,c=>{
  c.modResults.manifest=configureManifest(c.modResults.manifest,enabled,config.android?.permissions);
  return c;
 });
 return withDangerousMod(config,['android',async c=>{
  const root=path.resolve(c.modRequest.platformProjectRoot);
  const dest=path.resolve(root,'app/src/main/java/br/com/andradeenergy/cemig');
  if(!dest.startsWith(root+path.sep))throw new Error('Destino nativo fora do projeto Android');
  if(enabled)fs.mkdirSync(dest,{recursive:true});
  for(const name of ['CemigBrowserActivity.kt','CemigBrowserService.kt']){
   const target=path.join(dest,name);
   if(enabled)fs.copyFileSync(path.join(__dirname,'cemig-browser',name),target);
   else if(fs.existsSync(target))fs.unlinkSync(target);
  }
  return c;
 }]);
};
module.exports.configureManifest=configureManifest;
