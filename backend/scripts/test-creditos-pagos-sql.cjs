// PostgreSQL embarcado isolado: nunca abre conexão com bancos de clientes.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
async function main() {
  const { PGlite } = await import(process.env.CREDITOS_PGLITE_MODULE);
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table unidades_consumidoras(id uuid primary key,empresa_id uuid,cliente_id uuid,numero text);
    create table faturas(id uuid primary key default gen_random_uuid(),empresa_id uuid,cliente_id uuid,
      unidade_consumidora_id uuid,numero_instalacao text,referencia text,modalidade_faturamento text,
      status text default 'ABERTA',base_calculo_kwh numeric,energia_compensada numeric,saldo_atual numeric,
      dados_extraidos jsonb,valor_total numeric);
    create table asaas_cobrancas(id uuid primary key default gen_random_uuid(),fatura_id uuid,empresa_id uuid,status text);`);
  // PGlite é single-connection; a trava real é fornecida pelo PostgreSQL em
  // produção. Aqui validamos o SQL, isolamento e a conferência do token.
  await db.exec(`create function public.pg_advisory_xact_lock(bigint) returns void language sql as 'select';`);
  await db.exec(readFileSync(path.resolve(__dirname,'../../supabase/migrations/20261118133723_creditos_pagos_modalidade.sql'),'utf8'));
  await db.exec(readFileSync(path.resolve(__dirname,'../../supabase/migrations/20261118141343_creditos_pagos_estornos.sql'),'utf8'));
  const empresa='11111111-1111-4111-8111-111111111111', uc='22222222-2222-4222-8222-222222222222', cliente='33333333-3333-4333-8333-333333333333';
  await db.query('insert into unidades_consumidoras values ($1,$2,$3,$4)',[uc,empresa,cliente,'99999101127']);
  await db.query(`insert into faturas(empresa_id,cliente_id,unidade_consumidora_id,numero_instalacao,referencia,modalidade_faturamento,status,base_calculo_kwh,energia_compensada,saldo_atual)
    values($1,$2,$3,'99999101127','JAN/2026','INJECAO','PAGO',800,300,500)`,[empresa,cliente,uc]);
  const historico=async()=> (await db.query('select historico_creditos_pagos_uc($1,$2,$3,$4) as h',[empresa,uc,'99999101127',cliente])).rows[0].h;
  const inicial=await historico(); assert.equal(inicial.faturas.length,1);
  const payload={empresa_id:empresa,cliente_id:cliente,unidade_consumidora_id:uc,numero_instalacao:'99999101127',referencia:'FEV/2026',modalidade_faturamento:'COMPENSACAO',base_calculo_kwh:0,energia_compensada:200,saldo_atual:300,valor_total:50,
    dados_extraidos:{creditos_pre_pagos:{versao:inicial.versao,saldo_anterior_kwh:500,utilizado_kwh:200,saldo_restante_kwh:300,energia_cobravel_kwh:0}}};
  const nova=(await db.query('select inserir_fatura_creditos_pagos($1) as f',[JSON.stringify(payload)])).rows[0].f;
  assert.ok(nova.id);assert.equal(nova.status,'ABERTA');assert.equal(nova.base_calculo_kwh,0);
  await assert.rejects(db.query('delete from faturas where id=$1',[nova.id]),/Concilie o saldo/);
  await assert.rejects(db.query("update faturas set status='CANCELADA' where id=$1",[nova.id]),/Concilie o saldo/);
  await assert.rejects(db.query('select inserir_fatura_creditos_pagos($1)',[JSON.stringify({...payload,referencia:'MAR/2026'})]),/histórico.*mudou/);
  await assert.rejects(db.query('select historico_creditos_pagos_uc($1,$2,$3,$4)',[empresa,uc,'99999101127','44444444-4444-4444-8444-444444444444']),/não pertence/);
  await assert.rejects(db.query(`insert into faturas(empresa_id,cliente_id,unidade_consumidora_id,numero_instalacao,referencia,modalidade_faturamento) values($1,$2,$3,'99999101127','MAR/2026','COMPENSACAO')`,[empresa,cliente,uc]),/créditos de injeção/);
  const antes=await historico();
  await db.query(`update faturas set status='ABERTA' where modalidade_faturamento='INJECAO'`);
  const depois=await historico(); assert.notEqual(antes.versao,depois.versao);
  await db.query("update faturas set status='PAGO' where modalidade_faturamento='INJECAO'");
  await db.query("insert into asaas_cobrancas(fatura_id,empresa_id,status) select id,empresa_id,'RECEIVED' from faturas where modalidade_faturamento='INJECAO'");
  const recebido=await historico();
  assert.equal(recebido.faturas.find(f=>f.modalidade_faturamento==='INJECAO').status,'PAGO');
  await db.query("update asaas_cobrancas set status='REFUNDED'");
  const estornado=await historico();
  assert.notEqual(recebido.versao,estornado.versao);
  assert.equal(estornado.faturas.find(f=>f.modalidade_faturamento==='INJECAO').status,'PAGAMENTO_PENDENTE_CONCILIACAO');
  const permissoes=await db.query(`select has_function_privilege('anon','public.historico_creditos_pagos_uc(uuid,uuid,text,uuid)','execute') a,
    has_function_privilege('authenticated','public.inserir_fatura_creditos_pagos(jsonb)','execute') b`);
  assert.deepEqual(permissoes.rows[0],{a:false,b:false});
  assert.equal((await db.query('select count(*)::int n from faturas')).rows[0].n,2);
  await db.close();
  console.log('SQL validado: emissão, defaults, token obsoleto, pagamento alterado, isolamento, caminho legado e permissões públicas.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
