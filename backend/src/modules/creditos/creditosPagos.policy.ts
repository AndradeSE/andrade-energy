type Historico = {
  id: string; referencia: string; modalidade_faturamento: string; status: string;
  base_calculo_kwh: unknown; energia_compensada: unknown; saldo_atual: unknown;
  dados_extraidos?: any;
};
const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
export function ordemCompetencia(valor: string): number {
  if (valor.startsWith('ENCERRAMENTO-')) return ordemCompetencia(valor.slice(13).replace('/', '-')) + 0.5;
  const mensal = /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/(\d{4})$/.exec(valor);
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(valor);
  const numerica = /^(\d{2})\/(\d{4})$/.exec(valor);
  const ano = Number(mensal?.[2] ?? iso?.[1] ?? numerica?.[2]);
  const mes = mensal ? meses.indexOf(mensal[1]) + 1 : Number(iso?.[2] ?? numerica?.[1]);
  if (!Number.isInteger(ano) || ano < 1900 || mes < 1 || mes > 12 || !Number.isInteger(mes)) {
    throw new Error('Confira a competência do histórico antes de utilizar créditos já pagos.');
  }
  return ano * 12 + mes;
}
function kwh(valor: unknown): number {
  const n = Number(valor);
  if (valor == null || !Number.isFinite(n) || n < 0) throw new Error('Histórico de créditos incompleto: confira os kWh e o saldo da UC.');
  return n;
}
const arredondar = (n: number) => Math.round(n * 1000) / 1000;
/** Reconstitui somente energia quitada. Nunca considera todo saldo Cemig como pago. */
export function saldoCreditosPagos(historico: Historico[], referencia?: string): number {
  const ativos = historico.filter(f => !['CANCELADA','CANCELADO','ESTORNADA','ESTORNADO'].includes(f.status)
    && (f.status !== 'RASCUNHO' || f.dados_extraidos?.creditos_pre_pagos));
  if (!ativos.some(f => f.modalidade_faturamento === 'INJECAO')) return 0;
  const ordenados = ativos.map(f => ({ f, ordem: ordemCompetencia(f.referencia) })).sort((a,b) => a.ordem-b.ordem);
  let saldo = 0;
  let anterior = -1;
  for (const { f, ordem } of ordenados) {
    if (ordem === anterior) throw new Error('Há competências duplicadas nesta UC. Confira o histórico antes de faturar.');
    if (saldo > 0 && anterior >= 0 && ordem > anterior + 1) throw new Error('Faltam competências no histórico desta UC. Confira o saldo já pago antes de faturar.');
    if (referencia && ordem >= ordemCompetencia(referencia)) throw new Error('Importe as competências em ordem. Há fatura desta competência ou posterior nesta UC.');
    anterior = ordem;
    const compensada = kwh(f.energia_compensada);
    const snapshot = f.dados_extraidos?.creditos_pre_pagos;
    if (f.modalidade_faturamento === 'INJECAO') {
      const entrada = f.status === 'PAGO' || f.status === 'PAGA' ? kwh(f.base_calculo_kwh) : 0;
      saldo = Math.max(0, saldo + entrada - compensada);
    } else {
      // Nas faturas novas só a parcela efetivamente abatida foi reservada.
      // Em históricos antigos, o consumo reduz conservadoramente o estoque.
      saldo = Math.max(0, saldo - (snapshot ? kwh(snapshot.utilizado_kwh) : compensada));
    }
    saldo = Math.min(saldo, kwh(f.saldo_atual));
  }
  if (saldo > 0 && referencia && anterior >= 0 && ordemCompetencia(referencia) > anterior + 1) {
    throw new Error('Importe as competências intermediárias para conferir o saldo já pago desta UC.');
  }
  return arredondar(saldo);
}
export function abaterCreditosPagos(saldo: number, compensada: number) {
  const disponivel = kwh(saldo), energia = kwh(compensada);
  const utilizado = Math.min(disponivel, energia);
  return { saldo_anterior_kwh: disponivel, utilizado_kwh: arredondar(utilizado), saldo_restante_kwh: arredondar(disponivel-utilizado), energia_cobravel_kwh: arredondar(energia-utilizado) };
}

export function conferirSaldoQuitado(historico: Historico[], referencia?: string): number {
  if (historico.some(f => f.modalidade_faturamento === 'INJECAO' && f.status === 'RASCUNHO' && Number(f.base_calculo_kwh) > 0)) {
    throw new Error('Revise os rascunhos de injeção desta UC antes de faturar por compensação.');
  }
  const pago = saldoCreditosPagos(historico, referencia);
  const faturado = saldoCreditosPagos(historico.map(f => ({ ...f,
    status: f.modalidade_faturamento === 'INJECAO' && !['CANCELADA','CANCELADO','ESTORNADA','ESTORNADO','RASCUNHO'].includes(f.status) ? 'PAGO' : f.status,
    dados_extraidos: f.status === 'RASCUNHO' ? f.dados_extraidos : undefined,
  })), referencia);
  if (faturado > pago + 0.001) throw new Error('Há créditos de injeção faturados e ainda não quitados nesta UC. Concilie os pagamentos antes de faturar por compensação, evitando cobrança duplicada.');
  return pago;
}
