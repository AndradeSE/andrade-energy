import {createHash} from "node:crypto";
import {supabase} from "../../config/supabase";
import {chaveCompetencia} from "../dashboard/competencia.policy";
import {criarNotificacaoApp} from "../notificacoes/push.service";
import {competenciaRateioCompleta,contratoElegivelParaRateio,type UcEsperada} from "./rateioAutomatico.policy";
import {destinatarioDoRateio,prepararPlanilhaRateio,enviarPlanilhaAoGerador} from "./rateioMensal.service";

async function todas(query:()=>any) {
  const rows:any[]=[];
  for(let start=0;start<100000;start+=1000){
    const result=await query().range(start,start+999);
    if(result.error)throw result.error;
    rows.push(...result.data??[]);
    if((result.data??[]).length<1000)return rows;
  }
  throw new Error("Volume de dados excede o limite de conferência automática.");
}

export async function notificarRateioGerado(usinaId:string,empresaId:string,plano:Awaited<ReturnType<typeof prepararPlanilhaRateio>>) {
  const destino=await destinatarioDoRateio(usinaId,empresaId);
  const hash=createHash("sha256").update(plano.csv).digest("hex").slice(0,24);
  await criarNotificacaoApp({usuario_id:destino.id,empresa_id:empresaId,usina_id:usinaId,tipo:"RATEIO_GERADO",
    titulo:`${plano.rascunho?"Rascunho de rateio":"Rateio"} gerado · ${plano.competencia}`,
    detalhe:plano.rascunho?`A planilha foi preparada para conferência. Pendências: ${plano.pendencias.join(" ") || "Revise os dados antes de solicitar à Cemig."}`:"O CSV no padrão Cemig está pronto para conferência. A geração não significa envio ou aprovação pela distribuidora.",
    rota:`/operacao/rateio?competencia=${encodeURIComponent(plano.competencia)}&usinaId=${encodeURIComponent(usinaId)}`,chave_dedupe:`rateio:${empresaId}:${usinaId}:${plano.competencia}:${hash}`});
}

export async function obterConfiguracaoRateio(usinaId:string,empresaId:string) {
  const scope=await supabase.from("usinas").select("id").eq("id",usinaId).eq("empresa_id",empresaId).maybeSingle();
  if(scope.error)throw scope.error;
  if(!scope.data)throw new Error("Usina não encontrada nesta empresa.");
  const setup=await supabase.from("rateio_configuracoes").upsert({usina_id:usinaId,empresa_id:empresaId},{onConflict:"usina_id",ignoreDuplicates:true});
  if(setup.error)throw setup.error;
  const config=await supabase.from("rateio_configuracoes").select("*").eq("usina_id",usinaId).eq("empresa_id",empresaId).single();
  if(config.error)throw config.error;
  const registros=await supabase.from("rateios_mensais_automaticos").select("competencia,status,gerado_em,email_status,erro").eq("empresa_id",empresaId).eq("usina_id",usinaId).order("competencia",{ascending:false}).limit(12);
  if(registros.error)throw registros.error;
  return {...config.data,registros:registros.data??[]};
}

export async function salvarConfiguracaoRateio(usinaId:string,empresaId:string,input:any) {
  await obterConfiguracaoRateio(usinaId,empresaId);
  const ancora=String(input.ucAncora??"").trim();
  if(ancora&&!/^\d{6,20}$/.test(ancora))throw new Error("Confira o número da UC âncora.");
  const unidades=await todas(()=>supabase.from("unidades_consumidoras").select("id,numero").eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("status","ATIVA").neq("tipo","GERADORA").order("id"));
  const result=await supabase.from("rateio_configuracoes").update({uc_ancora:ancora,numeros_confirmados:input.numerosAtuaisConfirmados===true,ucs_confirmadas:input.numerosAtuaisConfirmados===true?unidades.map(u=>String(u.numero)):[],atualizado_em:new Date().toISOString()}).eq("usina_id",usinaId).eq("empresa_id",empresaId);
  if(result.error)throw result.error;
  return obterConfiguracaoRateio(usinaId,empresaId);
}

export async function buscarRateioAutomatico(usinaId:string,empresaId:string,competencia:string) {
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia))throw new Error("Competência inválida.");
  const result=await supabase.from("rateios_mensais_automaticos").select("resultado,status").eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("competencia",`${competencia}-01`).maybeSingle();
  if(result.error)throw result.error;
  if(result.data?.status!=="GERADO"||!result.data.resultado)throw new Error("O rateio automático desta competência ainda não está disponível.");
  return result.data.resultado;
}

async function entregarGerado(registro:any) {
  const plano=registro.resultado as Awaited<ReturnType<typeof prepararPlanilhaRateio>>;
  await notificarRateioGerado(registro.usina_id,registro.empresa_id,plano);
  // Reserva persistente antes de enviar: uma interrupção não dispara outro e-mail às cegas.
  const reserva=await supabase.from("rateios_mensais_automaticos").update({email_status:"ENVIANDO"}).eq("id",registro.id).eq("email_status","PENDENTE").select("id");
  if(reserva.error)throw reserva.error;
  if(!reserva.data?.length)return;
  const envio=await enviarPlanilhaAoGerador(registro.usina_id,registro.empresa_id,plano,{},`rateio-mensal-${registro.id}`).catch(()=>({enviado:false}));
  const final=await supabase.from("rateios_mensais_automaticos").update({email_status:envio.enviado?"ENVIADO":"NAO_ENVIADO",atualizado_em:new Date().toISOString()}).eq("id",registro.id);
  if(final.error)throw final.error;
}

async function processarUsina(config:any) {
  const empresa=config.empresa_id,usina=config.usina_id;
  const [producoes,faturas,unidades,contratos]=await Promise.all([
    todas(()=>supabase.from("fechamentos").select("competencia,energia_gerada").eq("empresa_id",empresa).eq("usina_id",usina).gte("competencia",config.competencia_inicio).order("competencia")),
    todas(()=>supabase.from("faturas").select("id,numero_instalacao,cliente_id,referencia,status").eq("empresa_id",empresa).eq("usina_id",usina).order("id")),
    todas(()=>supabase.from("unidades_consumidoras").select("id,numero,cliente_id,created_at").eq("empresa_id",empresa).eq("usina_id",usina).eq("status","ATIVA").neq("tipo","GERADORA").order("id")),
    todas(()=>supabase.from("contratos").select("id,unidade_consumidora_id,aceite_cliente_em,contrato_assinado_url,status,dados_documento,vigencia_inicio").eq("empresa_id",empresa).in("status",["ATIVO","VIGENTE"]).order("id")),
  ]);
  const hoje=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(new Date());
  const competenciaAtual=`${hoje.find(p=>p.type==="year")!.value}-${hoje.find(p=>p.type==="month")!.value}`;
  for(const competencia of [...new Set(producoes.map(p=>chaveCompetencia(p.competencia)))]) {
    if(competencia>competenciaAtual)continue;
    const inicioSeguinte=new Date(`${competencia}-01T00:00:00Z`);inicioSeguinte.setUTCMonth(inicioSeguinte.getUTCMonth()+1);
    const limite=inicioSeguinte.toISOString();
    const assinadas=new Set(contratos.filter(c=>contratoElegivelParaRateio(c)&&(!c.vigencia_inicio||String(c.vigencia_inicio)<limite.slice(0,10))).map(c=>c.unidade_consumidora_id));
    const esperadas=unidades.filter(u=>u.cliente_id&&assinadas.has(u.id)&&(!u.created_at||String(u.created_at)<limite)) as UcEsperada[];
    if(!competenciaRateioCompleta(competencia,esperadas,faturas,producoes))continue;
    const claim=await supabase.rpc("reivindicar_rateio_mensal",{p_empresa:empresa,p_usina:usina,p_competencia:`${competencia}-01`,p_ucs:esperadas});
    if(claim.error)throw claim.error;
    const registro=claim.data?.[0];
    if(!registro)continue;
    try {
      const numerosConfirmados=config.numeros_confirmados===true&&esperadas.every(u=>(config.ucs_confirmadas??[]).includes(String(u.numero)));
      let plano=await prepararPlanilhaRateio(usina,empresa,competencia,config.uc_ancora,"",numerosConfirmados,false);
      if(!plano.pendencias.length)plano=await prepararPlanilhaRateio(usina,empresa,competencia,config.uc_ancora,"",numerosConfirmados,true);
      const pronto=await supabase.from("rateios_mensais_automaticos").update({status:"GERADO",resultado:plano,gerado_em:new Date().toISOString(),erro:null,lease_ate:null}).eq("id",registro.id).eq("lease_id",registro.lease_id).eq("status","GERANDO").select("*");
      if(pronto.error)throw pronto.error;
      if(pronto.data?.[0])await entregarGerado(pronto.data[0]);
    }catch(error:any){
      // Se a geração já terminou, não a desfaz por uma falha de entrega.
      await supabase.from("rateios_mensais_automaticos").update({status:"ERRO",erro:String(error?.message??"Falha ao gerar rateio").slice(0,500),lease_ate:new Date(Date.now()+5*60_000).toISOString()}).eq("id",registro.id).eq("lease_id",registro.lease_id).eq("status","GERANDO");
    }
  }
  const pendentes=await supabase.from("rateios_mensais_automaticos").select("*").eq("empresa_id",empresa).eq("usina_id",usina).eq("status","GERADO").order("competencia",{ascending:false}).limit(12);
  if(pendentes.error)throw pendentes.error;
  for(const registro of pendentes.data??[])await entregarGerado(registro);
}

let executando=false;
export async function processarRateiosAutomaticos() {
  if(executando)return;
  executando=true;
  try {
    // Também inclui usinas novas; nunca substitui uma configuração já salva.
    const usinas=await todas(()=>supabase.from("usinas").select("id,empresa_id").order("id"));
    if(usinas.length){const setup=await supabase.from("rateio_configuracoes").upsert(usinas.filter(u=>u.empresa_id).map(u=>({usina_id:u.id,empresa_id:u.empresa_id})),{onConflict:"usina_id",ignoreDuplicates:true});if(setup.error)throw setup.error;}
    const configs=await todas(()=>supabase.from("rateio_configuracoes").select("*").eq("habilitado",true).order("usina_id"));
    for(const config of configs)await processarUsina(config).catch(error=>console.error("Falha no rateio automático",{usinaId:config.usina_id,tipo:error?.code??error?.name??"Error"}));
  }finally{executando=false;}
}
