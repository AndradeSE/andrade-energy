import { supabase } from '../../config/supabase';
import { garantirRegistroDaEmpresa } from '../../utils/empresaScope';

export async function cadastrarUnidadeOperacional(usinaId: string, input: any, empresaId: string) {
  if (!empresaId) throw new Error('Empresa não informada.');
  if (!['GERADORA', 'CONSUMIDORA'].includes(input?.tipo)) throw new Error('Tipo de unidade inválido.');
  const numero = String(input.numero ?? '').replace(/\D/g, '');
  if (!numero || numero.length > 20) throw new Error('Número da UC inválido.');
  const desconto = Number(input.desconto_percentual ?? 40);
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) throw new Error('Desconto inválido.');
  if (!['INJECAO', 'COMPENSACAO'].includes(input.modalidade_faturamento)) throw new Error('Modalidade inválida.');
  await garantirRegistroDaEmpresa('usinas', usinaId, empresaId);
  if (input.cliente_id) await garantirRegistroDaEmpresa('clientes', input.cliente_id, empresaId);
  const dados: Record<string, unknown> = {};
  for (const campo of ['titular', 'distribuidora', 'endereco', 'cpf_titular', 'percentual_repasse_disponibilidade', 'repassar_disponibilidade_gd1', 'repassar_disponibilidade_gd2', 'repassar_diferenca_fio_b_gd2', 'tipo_gd', 'fatura_somente_andrade']) {
    if (input[campo] !== undefined) dados[campo] = input[campo];
  }
  const { data, error } = await supabase.from('unidades_consumidoras').insert({
    ...dados, numero, tipo: input.tipo, cliente_id: input.cliente_id || null,
    usina_id: usinaId, empresa_id: empresaId, status: 'PENDENTE_CONTRATO',
    modalidade_faturamento: input.modalidade_faturamento, desconto_percentual: desconto,
  }).select('id,numero,tipo').single();
  if (error?.code === '23505') throw new Error('Esta UC já está cadastrada. Abra sua configuração para editá-la.');
  if (error) throw error;
  return data;
}
