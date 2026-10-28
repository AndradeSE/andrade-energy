const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync('plugins/cemig-browser/CemigBrowserService.kt','utf8');
const start=source.indexOf("if(/\\.csv$/i.test(f.name)");const end=source.indexOf('var state=',start);assert.ok(start>0&&end>start);
const script=source.slice(start,end);
class Transfer{constructor(){this.files=[];this.items={add:file=>this.files.push(file)};}}
test('normaliza MIME legado preservando bytes, nome e data',async()=>{const f=new File(['a;b;c;X\r\nd;e;f;'],'rateio.csv',{type:'text/comma-separated-values',lastModified:123});const input={files:[f]};const context={f,input,DataTransfer:Transfer,File};vm.runInNewContext(script,context);assert.equal(input.files[0].type,'text/csv');assert.equal(await input.files[0].text(),await f.text());assert.equal(input.files[0].name,f.name);assert.equal(input.files[0].lastModified,123);assert.equal(input.files[0].size,f.size);});
test('não modifica outros tipos ou arquivo que não é CSV',()=>{for(const [name,type] of [['a.csv','text/csv'],['a.pdf','text/comma-separated-values']]){const f=new File(['test'],name,{type});const input={files:[f]};vm.runInNewContext(script,{f,input,DataTransfer:Transfer,File});assert.equal(input.files[0],f);}});
