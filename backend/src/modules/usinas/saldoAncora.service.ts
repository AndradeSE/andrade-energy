import { supabase } from "../../config/supabase";
import { ultimoSaldoAncora } from "./saldoAncora.policy";

export async function obterSaldoAncora(usinaId:string, empresaId:string, numero:string, competencia:string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Competência inválida.");
  const usina = await supabase.from("usinas").select("numero_instalacao").eq("id",usinaId).eq("empresa_id",empresaId).maybeSingle();
  if(usina.error) throw usina.error;
  if(!usina.data) throw new Error("Usina não encontrada.");
  const geradora=String(usina.data.numero_instalacao??"").replace(/\D/g,"");
  const uc=String(numero||geradora).replace(/\D/g,"");
  if(!/^\d{6,20}$/.test(uc)) throw new Error("Confira a UC âncora.");
  let leituras:Array<{saldo:unknown;referencia:unknown;informado?:boolean;registradoEm?:string}>=[];
  if(uc===geradora){
    const r=await supabase.from("fechamentos").select("saldo_creditos_kwh,competencia,updated_at").eq("empresa_id",empresaId).eq("usina_id",usinaId).lte("competencia",`${competencia}-01`).order("competencia",{ascending:false}).limit(1000);
    if(r.error)throw r.error;
    leituras=(r.data??[]).map(l=>({saldo:l.saldo_creditos_kwh,referencia:l.competencia,informado:l.saldo_creditos_kwh!=null,registradoEm:l.updated_at}));
  }else{
    const unidade=await supabase.from("unidades_consumidoras").select("cliente_id").eq("empresa_id",empresaId).eq("usina_id",usinaId).eq("numero",uc).maybeSingle();
    if(unidade.error)throw unidade.error;
    if(!unidade.data?.cliente_id)return {uc,saldoKwh:null,referencia:null};
    const [faturas,anexos]=await Promise.all([
      supabase.from("faturas").select("saldo_atual,referencia,status,created_at").eq("empresa_id",empresaId).eq("cliente_id",unidade.data.cliente_id).eq("numero_instalacao",uc).limit(1000),
      supabase.from("faturas_anexadas_clientes").select("dados_fatura,criado_em").eq("empresa_id",empresaId).eq("cliente_id",unidade.data.cliente_id).limit(1000),
    ]);
    if(faturas.error)throw faturas.error;
    if(anexos.error)throw anexos.error;
    if((faturas.data?.length??0)>=1000||(anexos.data?.length??0)>=1000)throw new Error("Histórico excede o limite de consulta.");
    leituras=[...(faturas.data??[]).filter(l=>!["CANCELADA","CANCELADO","RASCUNHO","ERRO","PROCESSANDO"].includes(String(l.status).toUpperCase())).map(l=>({saldo:l.saldo_atual,referencia:l.referencia,registradoEm:l.created_at})),
      ...(anexos.data??[]).flatMap(l=>{const d=l.dados_fatura as any;return String(d?.uc??"").replace(/\D/g,"")===uc?[{saldo:d.saldoAtual,informado:d.saldoAtualInformado,referencia:d.referencia,registradoEm:l.criado_em}]:[];})];
  }
  return {uc,...ultimoSaldoAncora(leituras,competencia)};
}
