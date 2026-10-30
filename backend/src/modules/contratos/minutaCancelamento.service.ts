import { supabase } from '../../config/supabase';

export function minutaSemAceite(contrato: any) {
  return String(contrato?.status ?? '').toUpperCase() === 'RASCUNHO'
    && !contrato.aceite_cliente_em && !contrato.contrato_assinado_url
    && !contrato.assinado_em && !contrato.assinatura_cliente_hash
    && contrato.dados_documento?.assinatura_externa_pendente !== true;
}

export async function cancelarMinutaSemAceite(id: string, usuario: any) {
  if (!['ADMIN', 'GESTOR'].includes(String(usuario?.perfil))
    || !['ADMIN_EMPRESA', 'GESTOR'].includes(String(usuario?.papel_empresa)) || !usuario?.empresa_id) {
    throw new Error('Somente o titular da operação pode cancelar uma minuta sem aceite.');
  }
  const { data: contrato, error } = await supabase.from('contratos').select('*')
    .eq('id', id).eq('empresa_id', usuario.empresa_id).maybeSingle();
  if (error) throw error;
  if (!contrato) throw new Error('Minuta não encontrada nesta empresa.');
  if (contrato.status === 'CANCELADO' && contrato.dados_documento?.minuta_cancelada_em) return { sucesso: true, status: 'CANCELADO' };
  if (!minutaSemAceite(contrato)) throw new Error('Somente minutas sem aceite e sem assinatura podem usar esta opção.');
  const agora = new Date().toISOString();
  let update = supabase.from('contratos').update({ status: 'CANCELADO', updated_at: agora,
    dados_documento: { ...contrato.dados_documento, minuta_cancelada_em: agora, minuta_cancelada_por: usuario.id },
  }).eq('id', id).eq('empresa_id', usuario.empresa_id).eq('status', 'RASCUNHO')
    .is('aceite_cliente_em', null).is('contrato_assinado_url', null).is('assinado_em', null).is('assinatura_cliente_hash', null);
  update = contrato.dados_documento == null ? update.is('dados_documento', null) : update.eq('dados_documento', JSON.stringify(contrato.dados_documento));
  const result = await update.select('id').maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('A minuta foi alterada ou assinada durante a operação. Atualize a lista antes de continuar.');
  return { sucesso: true, status: 'CANCELADO', message: 'Minuta cancelada sem cobrança. O documento não poderá mais ser aceito.' };
}
