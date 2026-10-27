const {withAndroidManifest,withDangerousMod}=require('expo/config-plugins');
const fs=require('node:fs');
const path=require('node:path');
module.exports=function withCemigBrowser(config){
 if(config.extra?.nativeCemigBrowser!==true)return config;
 config=withAndroidManifest(config,c=>{
  const m=c.modResults.manifest;
  m['uses-permission']??=[];
  for(const permission of ['android.permission.FOREGROUND_SERVICE','android.permission.FOREGROUND_SERVICE_DATA_SYNC']){
   if(!m['uses-permission'].some(p=>p.$?.['android:name']===permission))m['uses-permission'].push({$:{'android:name':permission}});
  }
  const app=m.application[0];app.activity??=[];app.service??=[];
  const activity='br.com.andradeenergy.cemig.CemigBrowserActivity';
  const service='br.com.andradeenergy.cemig.CemigBrowserService';
  app.activity=app.activity.filter(a=>a.$['android:name']!==activity);
  app.service=app.service.filter(a=>a.$['android:name']!==service);
  app.activity.push({$:{'android:name':activity,'android:exported':'false','android:launchMode':'singleTask','android:windowSoftInputMode':'adjustResize','android:theme':'@android:style/Theme.Material.Light.NoActionBar','android:configChanges':'orientation|screenSize|keyboardHidden'}});
  app.service.push({$:{'android:name':service,'android:exported':'false','android:foregroundServiceType':'dataSync','android:stopWithTask':'true'}});
  return c;
 });
 return withDangerousMod(config,['android',async c=>{
  const dest=path.join(c.modRequest.platformProjectRoot,'app/src/main/java/br/com/andradeenergy/cemig');
  fs.mkdirSync(dest,{recursive:true});
  for(const name of ['CemigBrowserActivity.kt','CemigBrowserService.kt'])fs.copyFileSync(path.join(__dirname,'cemig-browser',name),path.join(dest,name));
  return c;
 }]);
};
