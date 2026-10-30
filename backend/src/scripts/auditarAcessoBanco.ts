import dotenv from 'dotenv';

async function main() {
  const caminho = process.argv[2];
  if (!caminho) throw new Error('Informe arquivo de configuração.');
  dotenv.config({ path: caminho, quiet: true } as any);
  const { supabase } = await import('../config/supabase.js');
  for (const tabela of ['usuarios', 'clientes', 'faturas', 'contratos', 'unidades_consumidoras']) {
    const { error } = await supabase.from(tabela).select('id').limit(1);
    console.log(JSON.stringify({ tabela, backendAcesso: !error }));
    if (error) throw new Error('Backend sem acesso.');
  }
  const { descriptografarDado } = await import('../utils/sensitiveData.js');
  for (const [tabela, coluna] of [['gerador_carteiras', 'pix_chave_criptografada'], ['carteira_comercial_assinaturas', 'pix_chave_criptografada'], ['financeiro_autenticadores', 'segredo_criptografado']]) {
    const { data, error } = await supabase.from(tabela).select(coluna);
    if (error) throw new Error('Falha ao consultar criptografia.');
    let protegidos = 0, legados = 0;
    for (const item of data ?? []) {
      const valor = (item as any)[coluna];
      if (!valor) continue;
      if (!String(valor).startsWith('v1.')) { legados++; continue; }
      descriptografarDado(valor);
      protegidos++;
    }
    console.log(JSON.stringify({ tabela, protegidos, legados, criptografiaValidada: true }));
  }
  const { data: carteiras, error: erroCarteira } = await supabase.from('gerador_carteiras').select('pix_chave');
  if (erroCarteira) throw new Error('Falha ao consultar legado Pix.');
  console.log(JSON.stringify({ pixEmTextoSimples: (carteiras ?? []).filter(item => Boolean(item.pix_chave)).length }));
}
main().catch(() => { console.error('Auditoria não concluída; detalhes sensíveis omitidos.'); process.exitCode = 1; });
