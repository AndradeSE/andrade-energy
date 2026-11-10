# Reserva de dados de produção — Neon

Projeto gratuito andrade-production-reserva (mute-frog-56574261), isolado do Preview. Origem Supabase ehnkyrsseisvvtbkwrvu; destino andrade_production_restore_primary. Nenhuma credencial faz parte deste documento.

## Preparação de 10/11/2026

- Porta somente os módulos de recuperação validados no Preview para a branch de produção, preservando as funcionalidades existentes.
- Exportação consistente restrita à service_role; estrutura, relações, sequências e registros são conferidos antes de publicar a cópia.
- PDFs e imagens dos buckets privados contratos, faturas, contingency-uploads e usinas são copiados com verificação SHA-256 e manifesto por versão.
- Sincronização a cada 15 minutos, com trava exclusiva. Falha mantém a última cópia íntegra; não substitui o Supabase como escritor.
- Referências legadas de Auth são aceitas somente para usuários inativos, com senha própria e sem sessão válida. Qualquer dependência ativa não suportada bloqueia a cópia.
- Recuperação é explicitamente somente consulta, com cópia recente (até 20 minutos), arquivos verificados, sessões existentes e isolamento por empresa/perfil. Gravações, novos logins, pagamentos, protocolos, webhooks e tarefas automáticas ficam bloqueados. Não há promoção automática de snapshot a escritor.
- O modo de consulta exige Render e API privada em loopback; não é habilitado na Netlify. A Netlify continua usando o Supabase.
- Cotas informa banco principal, prontidão e horário da cópia. Trocas efetivas geram histórico e push administrativo, sem avisos falsos nos ensaios.

## Validação

Compilação e 11 testes locais aprovados; teste transacional isolado requer PostgreSQL de teste e não foi executado localmente. A publicação executa ainda verificação real de estrutura, cópia, API privada, rejeição anônima, escopo de sessão, bloqueio de escrita e hash do PDF. Estado online deve ser conferido antes de considerar a reserva pronta. NEON_RECOVERY_READ_ONLY permanece false.
