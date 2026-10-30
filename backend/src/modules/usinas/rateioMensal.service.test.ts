import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL = "https://rateio-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "test";
process.env.RESEND_API_KEY = "test";
process.env.EMAIL_DESTINATARIOS_PERMITIDOS = "gerador@example.com";

test("planilha usa somente empresa/usina solicitadas, produção real e contratos assinados; envio anexa CSV ao titular",async()=>{
  const {prepararPlanilhaRateio,enviarPlanilhaAoGerador}=await import("./rateioMensal.service.js");
  const original=globalThis.fetch;
  let semProducao=false,outraEmpresa=false,enviados=0,patches=0;
  globalThis.fetch=async(input,init)=>{
    const url=new URL(String(input));
    if(url.hostname==="api.resend.com"){
      const body=JSON.parse(String(init?.body));
      assert.deepEqual(body.to,["gerador@example.com"]);
      assert.match(Buffer.from(body.attachments[0].content,"base64").toString(),/UC âncora/);
      enviados++;return Response.json({id:"simulado"});
    }
    assert.equal(init?.method??"GET","GET"); // Nenhuma gravação, cobrança ou crédito.
    if(init?.method==="PATCH")patches++;
    const tabela=url.pathname.split("/").pop();
    let dados:any;
    if(tabela==="usinas"){
      assert.equal(url.searchParams.get("id"),"eq.usina-a");
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      dados=outraEmpresa?null:{id:"usina-a",numero_instalacao:"456789123",geracao_media:50000};
    }else if(tabela==="fechamentos"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      assert.equal(url.searchParams.get("usina_id"),"eq.usina-a");
      assert.ok(url.search.includes("2025-11-01"));assert.ok(url.search.includes("2026-11-01"));
      dados=semProducao?[]:[{energia_gerada:8000},{energia_gerada:12000}];
    }else if(tabela==="unidades_consumidoras"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      assert.equal(url.searchParams.get("usina_id"),"eq.usina-a");
      dados=url.searchParams.get("tipo")==="eq.GERADORA" ? {cpf_titular:"52998224725"} : [{id:"u1",numero:"123456789",cliente_id:"c1",consumo_medio_kwh:1000},{id:"minuta",numero:"123456780",consumo_medio_kwh:2000},{id:"cancelado",numero:"123456781",consumo_medio_kwh:3000}];
    }else if(tabela==="faturas"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      assert.equal(url.searchParams.get("cliente_id"),"in.(c1)");
      dados=[{numero_instalacao:"123456789",cliente_id:"c1",referencia:"SET/2026",saldo_atual:200,status:"PAGO"}];
    }else if(tabela==="uc_bloqueios_inadimplencia"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");dados=null;
    }else if(tabela==="faturas_anexadas_clientes"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");dados=[];
    }else if(tabela==="contratos"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      assert.equal(url.searchParams.get("status"),"in.(ATIVO,VIGENTE)");
      dados=[{unidade_consumidora_id:"u1",status:"VIGENTE"},{unidade_consumidora_id:"minuta",status:"ATIVO"}];
    }else if(tabela==="gerador_carteiras"){
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
      assert.equal(url.searchParams.get("usina_id"),"eq.usina-a");dados=[{usuario_id:"titular-a"}];
    }else if(tabela==="usuarios"){
      assert.equal(url.searchParams.get("id"),"eq.titular-a");
      assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");dados={email:"gerador@example.com"};
    }else if(tabela==="empresas")dados={nome:"Empresa A"};
    else throw Error(`Consulta inesperada: ${tabela}`);
    return Response.json(dados);
  };
  try{
    const p=await prepararPlanilhaRateio("usina-a","empresa-a","2026-10","");
    assert.equal(p.producaoMedia,10000);assert.equal(p.linhas[0].percentual,8);assert.equal(p.ucsExcluidas,2);
    assert.equal(p.linhas[0].saldo,200);assert.equal(p.linhas[0].saldoReferencia,"2026-09");
    assert.equal(enviados,0);assert.equal(patches,0);
    assert.deepEqual(await enviarPlanilhaAoGerador("usina-a","empresa-a",p,{id:"colaborador"}),{enviado:true});
    assert.equal(enviados,1);
    semProducao=true;await assert.rejects(()=>prepararPlanilhaRateio("usina-a","empresa-a","2026-10",""),/produção real/);
    outraEmpresa=true;await assert.rejects(()=>prepararPlanilhaRateio("usina-a","empresa-a","2026-10",""),/não encontrada/);
  }finally{globalThis.fetch=original;}
});
