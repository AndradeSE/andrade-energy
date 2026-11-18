import { supabase } from '../../config/supabase';
import { abaterCreditosPagos, conferirSaldoQuitado } from './creditosPagos.policy';

async function historicoDaUc(empresaId: string, unidadeId: string, numero: string, clienteId: string) {
  const { data, error } = await supabase.rpc('historico_creditos_pagos_uc', {
    p_empresa: empresaId, p_unidade: unidadeId, p_numero: numero, p_cliente: clienteId,
  });
  if (error) throw new Error('Não foi possível conferir os créditos já pagos desta UC. Atualize a estrutura do banco e tente novamente.');
  return data;
}
export async function conferirTransicaoParaCompensacao(empresaId: string, unidadeId: string, numero: string, clienteId: string) {
  const data = await historicoDaUc(empresaId, unidadeId, numero, clienteId);
  if (!data.faturas.some((f: any) => f.modalidade_faturamento === 'INJECAO' && !['RASCUNHO','CANCELADA','CANCELADO'].includes(f.status))) {
    throw new Error('Importe o histórico de injeção e confira os pagamentos desta UC antes de trocar para compensação. Não é seguro presumir que o saldo já foi pago.');
  }
  return conferirSaldoQuitado(data.faturas);
}
export async function consultarCreditosPagos(empresaId: string, unidadeId: string, numero: string, clienteId: string, energia: number, referencia?: string) {
  const data = await historicoDaUc(empresaId, unidadeId, numero, clienteId);
  return { versao: data.versao, ...abaterCreditosPagos(conferirSaldoQuitado(data.faturas, referencia), energia) };
}
