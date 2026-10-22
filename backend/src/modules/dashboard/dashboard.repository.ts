import { supabase } from "../../config/supabase";
import {saldoAnteriorParaRateio} from "../usinas/saldoRateio.policy";

export async function obterDashboardCliente(
  clienteId: string,
  uc: string | undefined,
  empresaId: string
) {
  // Cliente
  const { data: cliente, error: erroCliente } =
    await supabase
      .from("clientes")
      .select(`
        id,
        nome,
        uc,
        distribuidora
      `)
      .eq("id", clienteId)
      .eq("empresa_id", empresaId)
      .single();

  if (erroCliente) throw erroCliente;

  // A concessionária pertence à UC, não ao cadastro geral do cliente. Esse
  // acesso direto também evita ambiguidades quando o consumidor possui mais
  // de uma unidade vinculada.
  let unidadeQuery = supabase
    .from("unidades_consumidoras")
    .select("numero,distribuidora")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId);
  if (uc) unidadeQuery = unidadeQuery.eq("numero", uc);
  const { data: unidade, error: erroUnidade } = await unidadeQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUnidade) throw erroUnidade;

  // Faturas
  let faturasQuery = supabase
      .from("faturas")
      .select(`
        id,
        referencia,
        numero_instalacao,
        cliente_id,
        saldo_atual,
        created_at,
        vencimento,
        valor_total,
        valor_total_unificado,
        status,
        economia_real,
        consumo,
        consumo_kwh,
        base_calculo_kwh,
        energia_injetada,
        energia_compensada,
        valor_usina,
        valor_andrade,
        valor_cemig,
        valor_cemig_repassado,
        custo_disponibilidade,
        custo_disponibilidade_repassado,
        valor_absorvido_disponibilidade,
        diferenca_fio_b_repassada,
        valor_absorvido_fio_b,
        valor_iluminacao_publica,
        valor_bandeira,
        valor_impostos,
        valor_energia_cheia,
        fatura_somente_andrade
      `)
      .eq("cliente_id", clienteId)
      .eq("empresa_id", empresaId);

  const numeroSelecionado=String(uc??unidade?.numero??cliente.uc??"");
  if (numeroSelecionado) faturasQuery = faturasQuery.eq("numero_instalacao", numeroSelecionado);
  const { data: faturas, error: erroFaturas } = await faturasQuery;

  if (erroFaturas) throw erroFaturas;

  // O saldo acompanha a UC, inclusive no modelo de injeção; não se usa o
  // último lançamento genérico do cliente, que pode pertencer à outra UC.
  const anexos=await supabase.from("faturas_anexadas_clientes").select("dados_fatura,criado_em").eq("cliente_id",clienteId).eq("empresa_id",empresaId).order("criado_em",{ascending:false});
  if(anexos.error)throw anexos.error;
  const hoje=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(new Date());
  const competencia=`${hoje.find(p=>p.type==="year")!.value}-${hoje.find(p=>p.type==="month")!.value}`;
  const saldo=saldoAnteriorParaRateio(numeroSelecionado,clienteId,competencia,[
    ...(faturas??[]).filter(f=>!["CANCELADO","CANCELADA","RASCUNHO"].includes(String(f.status).toUpperCase())).map(f=>({numero:f.numero_instalacao,clienteId:f.cliente_id,referencia:f.referencia,saldo:f.saldo_atual,registradoEm:f.created_at,fonte:"FATURA" as const})),
    ...(anexos.data??[]).map(a=>{const dados=a.dados_fatura as any;return {numero:dados?.uc??dados?.numero_instalacao,clienteId,referencia:dados?.referencia,saldo:dados?.saldoAtual,registradoEm:a.criado_em,fonte:"ANEXO" as const};}),
  ]);

  return {
    ...cliente,
    uc: unidade?.numero ?? uc ?? cliente.uc,
    distribuidora: unidade?.distribuidora ?? cliente.distribuidora,
    creditos:saldo.saldo,
    saldoAtual:saldo.semHistorico?null:saldo.saldo,
    competenciaSaldo:saldo.referencia??null,
    faturas: faturas ?? [],
  };
}
