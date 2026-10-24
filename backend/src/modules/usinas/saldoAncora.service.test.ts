import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL="https://saldo-ancora-test.invalid";
process.env.SUPABASE_SERVICE_KEY="test";
test("consulta âncora isola empresa, usina e UC, descarta faturas canceladas e não grava",async()=>{
  const {obterSaldoAncora}=await import("./saldoAncora.service.js");
  const original=globalThis.fetch;let ausente=false;
  globalThis.fetch=async(input,init)=>{
    assert.equal(init?.method??"GET","GET");
    const url=new URL(String(input));assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
    const tabela=url.pathname.split("/").pop();let dados:any;
    if(tabela==="usinas"){assert.equal(url.searchParams.get("id"),"eq.usina-a");dados=ausente?null:{numero_instalacao:"111111"};}
    else if(tabela==="fechamentos"){assert.equal(url.searchParams.get("usina_id"),"eq.usina-a");dados=[{saldo_creditos_kwh:0,competencia:"2026-10-01"}];}
    else if(tabela==="unidades_consumidoras"){assert.equal(url.searchParams.get("usina_id"),"eq.usina-a");assert.equal(url.searchParams.get("numero"),"eq.222222");dados={cliente_id:"cliente-a"};}
    else if(tabela==="faturas"){assert.equal(url.searchParams.get("cliente_id"),"eq.cliente-a");assert.equal(url.searchParams.get("numero_instalacao"),"eq.222222");dados=[{saldo_atual:50,referencia:"SET/2026",status:"PAGO"},{saldo_atual:999,referencia:"OUT/2026",status:"CANCELADA"}];}
    else if(tabela==="faturas_anexadas_clientes")dados=[{dados_fatura:{uc:"333333",saldoAtual:99999,referencia:"OUT/2026"}}];
    else throw Error("Consulta inesperada");
    return Response.json(dados);
  };
  try{
    assert.deepEqual(await obterSaldoAncora("usina-a","empresa-a","","2026-10"),{uc:"111111",saldoKwh:0,referencia:"2026-10"});
    assert.deepEqual(await obterSaldoAncora("usina-a","empresa-a","222222","2026-10"),{uc:"222222",saldoKwh:50,referencia:"2026-09"});
    ausente=true;await assert.rejects(()=>obterSaldoAncora("usina-a","empresa-a","","2026-10"),/não encontrada/);
  }finally{globalThis.fetch=original;}
});
