import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoPublicoPush } from '../notificacoes/pushPublico.policy';
process.env.SUPABASE_URL='https://gmail-tests.example.com';
process.env.SUPABASE_SERVICE_KEY='fixture';
const {avisarFaturamentoAutomatico}=require('./avisosAutomaticos.service') as typeof import('./avisosAutomaticos.service');
function scenario(tipo='GERADORA'){
 const avisos:any[]=[];const db:any={from(table:string){const q:any={select:()=>q,eq:()=>q,in:()=>q,maybeSingle:()=>q,then(resolve:any){return Promise.resolve({error:null,data:table==='unidades_consumidoras'?{id:'uc',numero:'123',tipo,usina_id:'plant',usinas:{nome:'Fixture'}}:[{usuario_id:'owner'},{usuario_id:'owner'}]}).then(resolve)}};return q}};
 return {avisos,deps:{db,criar:async(n:any)=>{avisos.push(n);return null}}};
}
for(const tipo of ['GERADORA','BENEFICIARIA'])test(`OAuth expirado em ${tipo} tem aviso específico e uma notificação por destinatário`,async()=>{const c=scenario(tipo);await avisarFaturamentoAutomatico({empresaId:'e',unidadeId:'uc',evento:'ERRO_IMPORTACAO',chave:'grant',detalhe:'Reconecte o Gmail.',motivoGmail:'OAUTH_REAUTORIZACAO'},c.deps);assert.equal(c.avisos.length,1);assert.equal(c.avisos[0].titulo,'Gmail · autorização expirada ou revogada');assert.equal(c.avisos[0].rota,'/unidades/recebimento-email?unidadeId=uc');assert.match(textoPublicoPush(c.avisos[0].titulo)!,/Reconecte o Gmail/);assert.doesNotMatch(textoPublicoPush(c.avisos[0].titulo)!,/123|Fixture/)});
test('falha real do PDF mantém o título de produção',async()=>{const c=scenario();await avisarFaturamentoAutomatico({empresaId:'e',unidadeId:'uc',evento:'ERRO_IMPORTACAO',chave:'pdf',detalhe:'Falhou'},c.deps);assert.equal(c.avisos[0].titulo,'Produção da usina · falha na leitura');assert.equal(textoPublicoPush(c.avisos[0].titulo),undefined)});
test('instruções de permissão e API não confundem reconexão com configuração administrativa',()=>{assert.match(textoPublicoPush('Gmail · autorize a leitura das faturas')!,/permita a leitura/);assert.match(textoPublicoPush('Gmail · integração indisponível')!,/administração/);assert.equal(textoPublicoPush('Texto externo não confiável'),undefined)});
