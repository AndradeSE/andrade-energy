import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export function releaseCommit(){
 try{
  const value=JSON.parse(readFileSync(join(__dirname,'../release.json'),'utf8')).commit;
  if(typeof value==='string'&&/^[0-9a-f]{7,40}$/.test(value))return value.slice(0,7);
 }catch{/* Development or serverless packaging may omit the build stamp. */}
 return (process.env.RENDER_GIT_COMMIT??process.env.COMMIT_REF)?.slice(0,7)??'local';
}
