import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL="https://saldo-test.invalid";
process.env.SUPABASE_SERVICE_KEY="test";
test("Home usa saldo da UC escolhida e conta original, sem saldo genérico do cliente",async()=>{
  const {obterDashboardCliente}=await import("./dashboard.repository.js");
  const original=globalThis.fetch;
  globalThis.fetch=async(input)=>{
    const url=new URL(String(input));const tabela=url.pathname.split("/").pop();
    assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
    let result:any;
    if(tabela==="clientes")result={id:"c",uc:"111111",nome:"Cliente"};
    else if(tabela==="unidades_consumidoras")result={numero:"111111",distribuidora:"CEMIG"};
    else if(tabela==="faturas"){
      assert.equal(url.searchParams.get("numero_instalacao"),"eq.111111");
      result=[{cliente_id:"c",numero_instalacao:"111111",referencia:"SET/2026",saldo_atual:10,status:"PAGO"}];
    }else if(tabela==="faturas_anexadas_clientes")result=[
      {dados_fatura:{uc:"111111",referencia:"OUT/2026",saldoAtual:0}},
      {dados_fatura:{uc:"222222",referencia:"OUT/2026",saldoAtual:9999}},
    ];else throw new Error(`Consulta indevida: ${tabela}`);
    return Response.json(result);
  };
  try{
    const data=await obterDashboardCliente("c","111111","empresa-a");
    assert.equal(data.saldoAtual,0);assert.equal(data.competenciaSaldo,"2026-10");
    assert.equal((await obterDashboardCliente("c",undefined,"empresa-a")).saldoAtual,0);
  }finally{globalThis.fetch=original;}
});
