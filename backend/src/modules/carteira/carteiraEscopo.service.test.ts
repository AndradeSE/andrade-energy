import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL="https://carteira-test.invalid";
process.env.SUPABASE_SERVICE_KEY="test";
process.env.ASAAS_API_KEY="test";
process.env.ASAAS_API_URL="https://asaas-test.invalid/v3";
test("ADM lê carteira histórica da usina e saldo líquido disponível, sem criar carteira pessoal",async()=>{
  const {resumoCarteira}=await import("./carteira.service.js");
  const original=globalThis.fetch;
  const carteira={id:"carteira-titular",usuario_id:"titular",empresa_id:"empresa",usina_id:null,status:"ATIVA",pix_chave:null};
  let saldo=386.45;
  let liquido: number | null = 386.45;
  globalThis.fetch=async(input,init)=>{
    assert.equal(init?.method??"GET","GET");
    const url=new URL(String(input));
    let resposta:any;
    if(url.pathname==="/rest/v1/usinas") resposta={id:"usina"};
    else if(url.pathname==="/rest/v1/gerador_carteiras") resposta=url.searchParams.has("usina_id")?null:carteira;
    else if(url.pathname==="/rest/v1/asaas_cobrancas") resposta=url.searchParams.has("faturas.usina_id")?[{gerador_carteira_id:carteira.id}]:[{status:"RECEIVED",valor:387.44,valor_liquido:liquido}];
    else if(url.pathname==="/rest/v1/asaas_transferencias") resposta=[{status:"REFUSED",valor:386.45}];
    else if(url.pathname==="/rest/v1/usuarios") resposta={cpf:"12345678901",ativo:true,empresa_id:"empresa"};
    else if(url.pathname==="/rest/v1/financeiro_autenticadores") {
      assert.equal(url.searchParams.get("usuario_id"),"eq.adm"); resposta=null;
    }
    else if(url.pathname==="/v3/myAccount/commercialInfo/") resposta={cpfCnpj:"12345678901"};
    else if(url.pathname==="/v3/finance/balance") resposta={balance:saldo};
    else throw new Error(`Consulta inesperada: ${url.pathname}`);
    return new Response(JSON.stringify(resposta),{status:200,headers:{"content-type":"application/json"}});
  };
  try {
    const adm={id:"adm",empresa_id:"empresa",perfil:"ADMIN",papel_empresa:"ADMIN_EMPRESA"};
    const resumo=await resumoCarteira(adm,"usina");
    assert.equal(resumo.id,"carteira-titular"); assert.equal(resumo.saldoDisponivel,386.45);
    assert.equal(resumo.recebimentoBruto,387.44);
    assert.equal(resumo.tarifasRecebimento,0.99);
    assert.equal(resumo.recebimentoLiquido,386.45);
    assert.equal(resumo.saldoAsaas,386.45);
    saldo=0; assert.equal((await resumoCarteira(adm,"usina")).saldoDisponivel,0);
    saldo=1000; liquido=null;
    const semTarifa = await resumoCarteira(adm,"usina");
    assert.equal(semTarifa.saldoDisponivel,0);
    assert.equal(semTarifa.tarifasRecebimento,null);
    assert.equal(semTarifa.recebimentoLiquido,null);
    await assert.rejects(resumoCarteira({...adm,papel_empresa:"COLABORADOR_GERADOR"},"usina"),/não autorizado/);
  } finally {globalThis.fetch=original;}
});
