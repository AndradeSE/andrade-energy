import assert from "node:assert/strict";
import test from "node:test";
process.env.SUPABASE_URL="https://rateio-test.invalid";
process.env.SUPABASE_SERVICE_KEY="test";
process.env.RESEND_API_KEY="test";
process.env.EMAIL_DESTINATARIOS_PERMITIDOS="gerador@example.com";

test("última fatura gera um arquivo persistente, um e-mail e um push; repetir a conferência não duplica",async()=>{
  const {processarRateiosAutomaticos,fechamentoRateioAtualCompleto}=await import("./rateioAutomatico.service.js");
  const {reivindicarEnvioNativo}=await import("./rateioEnvioNativo.service.js");
  process.env.CEMIG_NATIVE_BACKGROUND_ENABLED="true";
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(new Date());
  const mes=`${parts.find(p=>p.type==="year")!.value}-${parts.find(p=>p.type==="month")!.value}`;
  const original=globalThis.fetch;
  let completa=false,email=0,push=0,claims=0;
  let registro:any;
  const avisos=new Map<string,any>();
  globalThis.fetch=async(input,init)=>{
    const url=new URL(String(input));const method=init?.method??"GET";
    const body=init?.body?JSON.parse(String(init.body)):undefined;
    if(url.hostname==="api.resend.com"){
      assert.deepEqual(body.to,["gerador@example.com"]);assert.ok(body.attachments[0].filename.endsWith(".csv"));
      const headers=new Headers(init?.headers);assert.equal(headers.get("Idempotency-Key"),"rateio-mensal-job-a");
      email++;return Response.json({id:"email-a"});
    }
    if(url.hostname==="exp.host"){
      assert.equal(body[0].to,"ExponentPushToken[TESTE]");assert.match(body[0].title,/Rateio do mês pronto para conferência/);
      assert.equal(body[0].data.url,`/operacao/rateio?competencia=${mes}&usinaId=usina-a`);
      push++;return Response.json({data:[{status:"ok",id:"ticket-a"}]});
    }
    const table=url.pathname.split("/").pop();let result:any=[];
    if(table==="rateio_envios_nativos")result={id:"old-job",competencia:`${mes}-01`,csv_hash:"a".repeat(64)};
    else if(table==="rateio_envio_nativo_config")result={habilitado:true,modo:"AUTOMATICO",competencia_inicio:`${mes}-01`};
    else if(table==="reivindicar_rateio_mensal"){
      assert.equal(body.p_empresa,"empresa-a");assert.equal(body.p_usina,"usina-a");claims++;
      if(registro?.status!=="GERADO"){registro={id:"job-a",empresa_id:"empresa-a",usina_id:"usina-a",status:"GERANDO",lease_id:"lease-a",competencia:`${mes}-01`,email_status:"PENDENTE"};result=[{...registro}];}
    }else if(table==="usinas"){
      result=url.searchParams.get("id")?{id:"usina-a",nome:"Usina Teste",numero_instalacao:"888888",titularidade_ucs_recebedoras:"GERADOR"}:[{id:"usina-a",empresa_id:"empresa-a"}];
    }else if(table==="rateio_configuracoes")result=method==="GET"?[{usina_id:"usina-a",empresa_id:"empresa-a",uc_ancora:"",habilitado:true,competencia_inicio:`${mes}-01`,numeros_confirmados:false,ucs_confirmadas:[]}]:[];
    else if(table==="fechamentos")result=[{competencia:`${mes}-01`,energia_gerada:10000}];
    else if(table==="faturas")result=completa?[{id:"f-a",numero_instalacao:"111111",cliente_id:"c-a",referencia:mes,status:"ABERTA",saldo_atual:200}]:[];
    else if(table==="unidades_consumidoras")result=url.searchParams.get("tipo")==="eq.GERADORA"?{cpf_titular:"52998224725"}:[{id:"uc-a",numero:"111111",cliente_id:"c-a",consumo_medio_kwh:1000,created_at:`${mes}-01T00:00:00Z`}];
    else if(table==="contratos")result=[{id:"contrato-a",unidade_consumidora_id:"uc-a",status:"VIGENTE"}];
    else if(table==="faturas_anexadas_clientes")result=[];
    else if(table==="uc_bloqueios_inadimplencia")result=null;
    else if(table==="rateios_mensais_automaticos"){
      if(method==="PATCH"){
        if(url.searchParams.get("email_status")==="eq.PENDENTE"&&registro.email_status!=="PENDENTE")result=[];
        else{Object.assign(registro,body);result=url.searchParams.has("select")?[{...registro}]:[];}
      }else result=registro?.status==="GERADO"?[{...registro}]:[];
    }else if(table==="gerador_carteiras")result=[{usuario_id:"gerador-a"}];
    else if(table==="usuarios")result={email:"gerador@example.com"};
    else if(table==="empresas")result={nome:"Empresa Teste"};
    else if(table==="notificacoes_app"){
      if(method==="POST"){avisos.set(body.chave_dedupe,{id:"aviso-a"});result={id:"aviso-a"};}
      else result=avisos.get(String(url.searchParams.get("chave_dedupe")).replace(/^eq\./,""))??null;
    }else if(table==="dispositivos_push")result=[{token:"ExponentPushToken[TESTE]"}];
    else throw new Error(`Consulta inesperada: ${table}`);
    if(["unidades_consumidoras","faturas","fechamentos","contratos"].includes(String(table)))assert.equal(url.searchParams.get("empresa_id"),"eq.empresa-a");
    return Response.json(result);
  };
  try{
    assert.equal(await fechamentoRateioAtualCompleto("usina-a","empresa-a",mes),false);
    await assert.rejects(reivindicarEnvioNativo("usina-a","empresa-a","gerador-a","old-job"),/Aguardando produção/);
    assert.equal(push,0);
    await processarRateiosAutomaticos();assert.equal(claims,0);assert.equal(email,0);
    completa=true;assert.equal(await fechamentoRateioAtualCompleto("usina-a","empresa-a",mes),true);
    completa=true;await processarRateiosAutomaticos();
    for(let i=0;i<10&&!push;i++)await new Promise(resolve=>setImmediate(resolve));
    assert.equal(registro.status,"GERADO");assert.equal(registro.resultado.linhas[0].percentual,8);
    assert.equal(email,1);assert.equal(push,1);assert.equal(avisos.size,1);
    await processarRateiosAutomaticos();assert.equal(email,1);assert.equal(push,1);assert.equal(avisos.size,1);
  }finally{globalThis.fetch=original;}
});
