const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const {recordRelease}=require('./record-ota-release.cjs');
test('publicação mantém histórico, separa variante/canal e usa data de São Paulo',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ae-release-'));const file=path.join(dir,'history.json');
  try {
    fs.writeFileSync(file,'[]');
    const message='Subopções; "Solar" e acentuação';
    recordRelease(file,'gerador','internal',message,new Date('2026-10-22T01:30:00Z'));
    recordRelease(file,'consumidor','clients','Menu',new Date('2026-10-22T01:31:00Z'));
    const entries=JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(entries.length,2);assert.equal(entries[1].data,'21/10/2026');assert.equal(entries[1].melhorias[0],message);
    assert.equal(entries[0].variant,'consumidor');assert.equal(entries[0].audience,'clients');
    assert.throws(()=>recordRelease(file,'outro','clients','teste'));
    assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).length,2);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
