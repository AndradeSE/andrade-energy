import { supabase } from "../../config/supabase";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { proporRateioMensal, csvRateioMensal, csvCemigRateio, pendenciasCsvCemig, documentoDaTitularidade } from "./rateioMensal.policy";
import { saldoAnteriorParaRateio, type LeituraSaldoRateio } from "./saldoRateio.policy";
import {contratoElegivelParaRateio} from "./rateioAutomatico.policy";

export async function prepararPlanilhaRateio(usinaId: string, empresaId: string, competencia: string, ancora: string, _documentoAncora = "", numerosAtuaisConfirmados = false, formatoCemig = false) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Selecione a competência do rateio.");
  const { data: usina, error } = await supabase.from("usinas").select("id,nome,numero_instalacao,geracao_media,titularidade_ucs_recebedoras")
    .eq("id",usinaId).eq("empresa_id",empresaId).maybeSingle();
  if (error) throw error;
  if (!usina) throw new Error("Usina não encontrada nesta empresa.");
  const inicio = new Date(`${competencia}-01T00:00:00Z`);
  inicio.setUTCMonth(inicio.getUTCMonth()-11);
  const fim = new Date(`${competencia}-01T00:00:00Z`);
  fim.setUTCMonth(fim.getUTCMonth()+1);
  const [producao, unidades, contratos, geradoraResult] = await Promise.all([
    supabase.from("fechamentos").select("energia_gerada").eq("empresa_id",empresaId).eq("usina_id",usinaId)
      .gte("competencia",inicio.toISOString().slice(0,10)).lt("competencia",fim.toISOString().slice(0,10)),
    supabase.from("unidades_consumidoras").select("id,numero,cliente_id,created_at,apelido,consumo_medio_kwh,cpf_titular,clientes(cpf,empresa_id)")
      .eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("status","ATIVA").neq("tipo","GERADORA").order("numero"),
    supabase.from("contratos").select("unidade_consumidora_id,aceite_cliente_em,contrato_assinado_url,status,dados_documento,vigencia_inicio")
      .eq("empresa_id",empresaId).in("status",["ATIVO","VIGENTE"]),
    supabase.from("unidades_consumidoras").select("cpf_titular").eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("tipo","GERADORA").maybeSingle(),
  ]);
  for (const r of [producao,unidades,contratos,geradoraResult]) if (r.error) throw r.error;
  let clienteAncora: any;
  let documentoDaUcAncora: unknown;
  if (ancora && ["CLIENTE","CONSUMIDOR"].includes(String(usina.titularidade_ucs_recebedoras).toUpperCase())) {
    const consultaAncora = await supabase.from("unidades_consumidoras").select("cpf_titular,clientes(cpf,empresa_id)").eq("empresa_id",empresaId).eq("numero",ancora).maybeSingle();
    if (consultaAncora.error) throw consultaAncora.error;
    documentoDaUcAncora=consultaAncora.data?.cpf_titular;
    const vinculo=consultaAncora.data?.clientes as any;
    clienteAncora=Array.isArray(vinculo)?vinculo[0]:vinculo;
  }
  // O documento não é informado pelo solicitante: segue a titularidade da usina.
  const documentoAncora=documentoDaTitularidade(usina.titularidade_ucs_recebedoras,geradoraResult.data?.cpf_titular,clienteAncora?.empresa_id===empresaId?clienteAncora?.cpf:null,documentoDaUcAncora);
  const valores = (producao.data ?? []).map(p=>Number(p.energia_gerada)).filter(n=>Number.isFinite(n)&&n>0);
  // Sem leituras reais não se usa a produção estimada do cadastro para enviar rateio.
  if (!valores.length) throw new Error("Importe uma produção real da usina nesta janela de 12 meses antes de gerar o rateio.");
  const media = valores.reduce((s,n)=>s+n,0)/valores.length;
  const assinadas = new Set((contratos.data ?? []).filter(c=>contratoElegivelParaRateio(c)&&(!c.vigencia_inicio||String(c.vigencia_inicio)<fim.toISOString().slice(0,10))).map(c=>c.unidade_consumidora_id));
  const elegiveis = (unidades.data ?? []).filter(u=>assinadas.has(u.id)&&(!u.created_at||String(u.created_at)<fim.toISOString()));
  const clientesIds=[...new Set(elegiveis.map(u=>u.cliente_id).filter(Boolean))];
  const [faturas,anexos]=clientesIds.length ? await Promise.all([
    supabase.from("faturas").select("cliente_id,numero_instalacao,referencia,saldo_atual,created_at,status").eq("empresa_id",empresaId).in("cliente_id",clientesIds),
    supabase.from("faturas_anexadas_clientes").select("cliente_id,dados_fatura,criado_em").eq("empresa_id",empresaId).in("cliente_id",clientesIds),
  ]) : [{data:[],error:null},{data:[],error:null}];
  if(faturas.error)throw faturas.error;
  if(anexos.error)throw anexos.error;
  const leituras:LeituraSaldoRateio[]=[
    ...(faturas.data??[]).filter(f=>!["CANCELADO","CANCELADA"].includes(String(f.status))).map(f=>({numero:f.numero_instalacao,clienteId:f.cliente_id,referencia:f.referencia,saldo:f.saldo_atual,registradoEm:f.created_at,fonte:"FATURA" as const})),
    ...(anexos.data??[]).map(a=>{const d=a.dados_fatura as any;return {numero:d?.uc,clienteId:a.cliente_id,referencia:d?.referencia,saldo:d?.saldoAtual,registradoEm:a.criado_em,fonte:"ANEXO" as const};}),
  ];
  let saldosSemHistorico=0;
  const plano = proporRateioMensal(media,elegiveis.map(u=>{
    const cliente=Array.isArray(u.clientes)?u.clientes[0]:u.clientes as any;
    const saldo=saldoAnteriorParaRateio(String(u.numero),String(u.cliente_id),competencia,leituras);
    if(saldo.semHistorico)saldosSemHistorico++;
    return {numero:String(u.numero),nome:u.apelido||`UC ${u.numero}`,
      documento:documentoDaTitularidade(usina.titularidade_ucs_recebedoras,geradoraResult.data?.cpf_titular,cliente?.empresa_id===empresaId?cliente?.cpf:null,u.cpf_titular),consumo_medio_kwh:Number(u.consumo_medio_kwh),saldo_atual_kwh:saldo.saldo,saldo_referencia:saldo.referencia};
  }),ancora);
  const geradora=String(usina.numero_instalacao ?? "").replace(/\D/g,"");
  const pendencias=pendenciasCsvCemig(plano,geradora,documentoAncora,numerosAtuaisConfirmados);
  return { ...plano, saldosSemHistorico, rascunho:!formatoCemig, formatoCemig, pendencias, competencia, mesesNaMedia:valores.length, ucsExcluidas:(unidades.data ?? []).length-elegiveis.length,
    arquivo:`${formatoCemig?"cemig-rateio":"rascunho-rateio"}-${competencia}-${String(usina.numero_instalacao || usina.id).replace(/[^\w-]/g,"")}.csv`,
    csv:formatoCemig ? csvCemigRateio(plano,geradora,documentoAncora,numerosAtuaisConfirmados) : csvRateioMensal({...plano,rascunho:true},competencia,geradora) };
}

export async function destinatarioDoRateio(usinaId: string, empresaId: string) {
  // O recebedor vem de vínculo interno, nunca de e-mail arbitrário enviado no corpo.
  const {data:carteiras,error} = await supabase.from("gerador_carteiras").select("usuario_id")
    .eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("status","ATIVA");
  if (error) throw error;
  const titulares = [...new Set((carteiras ?? []).map(c=>c.usuario_id))];
  let destinatarioId = titulares.length===1 ? titulares[0] : null;
  if (!titulares.length) {
    const {data:vinculos,error:erroVinculo} = await supabase.from("empresa_usuarios").select("usuario_id")
      .eq("empresa_id",empresaId).eq("principal",true).eq("ativo",true).in("papel",["GESTOR","ADMIN_EMPRESA"]);
    if (erroVinculo) throw erroVinculo;
    const proprietarios = [...new Set((vinculos ?? []).map(v=>v.usuario_id))];
    // Não escolhe um ADM arbitrário quando houver mais de um titular possível.
    if (proprietarios.length === 1) destinatarioId = proprietarios[0];
  }
  if (!destinatarioId) throw new Error("Defina o titular da usina para identificar o e-mail do gerador.");
  const {data:destino,error:erroDestino} = await supabase.from("usuarios").select("email")
    .eq("id",destinatarioId).eq("empresa_id",empresaId).eq("ativo",true).maybeSingle();
  if (erroDestino) throw erroDestino;
  if (!destino?.email) throw new Error("O gerador não possui e-mail cadastrado.");
  return {id:String(destinatarioId),email:destino.email};
}

export async function enviarPlanilhaAoGerador(usinaId: string, empresaId: string, plano: Awaited<ReturnType<typeof prepararPlanilhaRateio>>, usuario: any, idempotencyKey?:string) {
  const destino=await destinatarioDoRateio(usinaId,empresaId);
  const enviado = await enviarEmailTransacional({empresaId,destinatario:destino.email,
    idempotencyKey,
    assunto:`${plano.rascunho ? "Rascunho de rateio" : "Proposta de rateio"} — ${plano.competencia}`,
    html:`<p>Segue a planilha mensal de rateio para conferência.</p><p>${plano.rascunho ? "Este arquivo é rascunho de conferência. Revise os dados e gere o CSV no padrão Cemig pelo aplicativo antes de solicitar o rateio." : "A UC âncora recebe a parcela não destinada às beneficiárias. O CSV segue o guia Cemig: UC, CPF/CNPJ, Cota e Âncora, sem cabeçalho."}</p><p>Os percentuais usam a necessidade de energia: consumo médio menos o saldo registrado da própria UC, com mínimo de zero, dividida pela média real de produção, sem margem adicional. A energia indicada é uma previsão. O documento não comprova envio nem aplicação pela Cemig.</p>`,
    anexos:[{filename:plano.arquivo,content:Buffer.from(plano.csv,"utf8"),contentType:"text/csv; charset=utf-8"}],
  });
  return { enviado };
}
