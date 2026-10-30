// Migração idempotente: preserva a senha atual e nunca registra credenciais.
import dotenv from 'dotenv';
import { protegerSenha } from '../utils/password';

async function main() {
  const envIndex = process.argv.indexOf('--env-file');
  if (envIndex < 0 || !process.argv[envIndex + 1]) throw new Error('Informe --env-file.');
  dotenv.config({ path: process.argv[envIndex + 1], quiet: true } as any);
  const { supabase } = await import('../config/supabase.js');
  const aplicar = process.argv.includes('--apply');
  let encontradas = 0, migradas = 0, concorrentes = 0;
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await supabase.from('usuarios').select('id,senha').order('id').range(inicio, inicio + 499);
    if (error) throw new Error('Falha ao consultar contas.');
    for (const usuario of data ?? []) {
      if (!usuario.senha || String(usuario.senha).startsWith('$argon2')) continue;
      encontradas++;
      if (!aplicar) continue;
      const { data: atualizado, error: erroAtualizar } = await supabase.from('usuarios')
        .update({ senha: await protegerSenha(String(usuario.senha)) })
        .eq('id', usuario.id).eq('senha', usuario.senha).select('id').maybeSingle();
      if (erroAtualizar) throw new Error('Falha ao proteger conta.');
      if (atualizado) migradas++; else concorrentes++;
    }
    if (!data || data.length < 500) break;
  }
  console.log(JSON.stringify({ aplicar, encontradas, migradas, concorrentes }));
}
main().catch(() => { console.error('Migração não concluída. Verifique o acesso ao banco sem expor credenciais.'); process.exitCode = 1; });
