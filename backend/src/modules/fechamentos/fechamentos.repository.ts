import { supabase } from "../../config/supabase";

const competenciaChave = (valor: unknown) => {
  const texto = String(valor ?? "").trim();
  const iso = /^(\d{4})-(\d{2})/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const br = /^(\d{2})\/(\d{4})$/.exec(texto);
  return br ? `${br[2]}-${br[1]}` : texto;
};

export async function obterResumoOperacao(empresaId: string, competenciaSolicitada?: string) {
  const [fechamentosResult, faturasResult, usinasResult] = await Promise.all([
    supabase.from("fechamentos").select("*").eq("empresa_id", empresaId).order("competencia", { ascending: false }),
    supabase.from("faturas").select("*, cobrancas(status,pago_em)").eq("empresa_id", empresaId),
    supabase.from("usinas").select("id,nome").eq("empresa_id", empresaId),
  ]);
  if (fechamentosResult.error) throw fechamentosResult.error;
  if (faturasResult.error) throw faturasResult.error;
  if (usinasResult.error) throw usinasResult.error;

  const todosFechamentos = fechamentosResult.data ?? [];
  const todasFaturas = faturasResult.data ?? [];
  const competencias = Array.from(new Set([
    ...todosFechamentos.map((item) => competenciaChave(item.competencia)),
    ...todasFaturas.map((item) => competenciaChave(item.referencia)),
  ].filter(Boolean))).sort().reverse();
  const competencia = competenciaChave(competenciaSolicitada) || competencias[0] || new Date().toISOString().slice(0, 7);
  const fechamentos = todosFechamentos.filter((item) => competenciaChave(item.competencia) === competencia);
  const faturas = todasFaturas.filter((item) => competenciaChave(item.referencia) === competencia);
  const numero = (valor: unknown) => Number(valor ?? 0) || 0;
  const paga = (fatura: any) => fatura.status === "PAGO" || (fatura.cobrancas ?? []).some((c: any) => c.status === "PAGO" || c.pago_em);
  const vencida = (fatura: any) => !paga(fatura) && fatura.vencimento && new Date(`${fatura.vencimento}T23:59:59`) < new Date();
  const energiaGerada = fechamentos.reduce((total, item) => total + numero(item.energia_gerada), 0);
  const energiaAlocada = fechamentos.reduce((total, item) => total + numero(item.energia_alocada), 0);
  const receitaPrevista = faturas.reduce((total, item) => total + numero(item.valor_total), 0)
    || fechamentos.reduce((total, item) => total + numero(item.receita_prevista), 0);
  const receitaRecebida = faturas.filter(paga).reduce((total, item) => total + numero(item.valor_total), 0)
    || fechamentos.reduce((total, item) => total + numero(item.receita_realizada), 0);
  const alertas: string[] = [];
  if (!fechamentos.length) alertas.push("Nenhuma produção importada para a competência.");
  if (!faturas.length) alertas.push("Nenhuma fatura emitida para a competência.");
  if (energiaAlocada > energiaGerada && energiaGerada > 0) alertas.push("A energia alocada supera a geração registrada.");
  const usinasSemFechamento = Math.max(0, (usinasResult.data ?? []).length - fechamentos.length);
  if (usinasSemFechamento) alertas.push(`${usinasSemFechamento} usina(s) ainda sem fechamento nesta competência.`);

  return {
    competencia,
    competencias,
    fechamentos: fechamentos.length,
    totalUsinas: (usinasResult.data ?? []).length,
    usinasSemFechamento,
    energiaGerada,
    energiaAlocada,
    energiaDisponivel: energiaGerada - energiaAlocada,
    ocupacao: energiaGerada > 0 ? (energiaAlocada / energiaGerada) * 100 : 0,
    receitaPrevista,
    receitaRecebida,
    receitaPendente: Math.max(0, receitaPrevista - receitaRecebida),
    totalFaturas: faturas.length,
    faturasPagas: faturas.filter(paga).length,
    faturasPendentes: faturas.filter((item) => !paga(item)).length,
    faturasVencidas: faturas.filter(vencida).length,
    alertas,
    prontoParaFechar: alertas.length === 0,
  };
}

export async function listarFechamentos(empresaId: string) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        *,
        usinas(nome)
      `)
      .eq("empresa_id", empresaId)
      .order("competencia", {
        ascending: false,
      });

  if (error) throw error;

  return data ?? [];
}

export async function buscarFechamento(
  id: string,
  empresaId: string
) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        *,
        usinas(*),
        rateios(
          *,
          clientes(nome,uc)
        )
      `)
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .single();

  if (error) throw error;

  return data;

}

export async function criarFechamento(
  fechamento: any,
  empresaId: string
) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .insert({ ...fechamento, empresa_id: empresaId })
      .select()
      .single();

  if (error) throw error;

  return data;

}
