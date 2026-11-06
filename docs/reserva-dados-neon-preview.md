# Reserva de dados — ensaio no Neon

Estado em 5 de novembro de 2026: **não habilitado como fallback**.

## Destino e limites do trabalho

- Origem exclusiva: Supabase Preview `qqhcjieymypowunkixmk`.
- Destino: Neon `andrade-preview-reserva`, projeto `twilight-dust-69590085`, branch `br-winter-sun-bebcn3nm`, endpoint `ep-misty-star-beg2irkr`.
- A branch padrão se chama `production` no Neon; isso não significa que contém dados de produção da Andrade.
- Nenhuma mudança de configuração dos apps ou do backend de produção foi feita nesta etapa.
- Não contratar recursos pagos nem depender de computador pessoal ligado.

## Evidências obtidas

1. Conexão PostgreSQL autenticada no Neon pelo fluxo oficial `psql -h pg.neon.tech`.
2. Exportação somente do schema `public` do Preview: 72 tabelas, sem registros de clientes. A exportação pela credencial temporária da CLI requer `pg_dump --role=postgres`; não é necessário conceder novos privilégios.
3. Importação transacional encontrou uma dependência externa: `usuarios.auth_user_id` referencia `auth.users(id)`. O ensaio foi revertido.
4. Consulta agregada à origem confirmou zero usuários em `auth.users` e zero vínculos `usuarios.auth_user_id` preenchidos. Isso não autoriza substituir um serviço de autenticação por funções simuladas.
5. Inspeção do backend: login próprio em `auth.service.ts`/`auth.repository.ts`, nenhuma chamada `supabase.auth`. Há chamadas de tabelas em 69 arquivos de implementação, RPC em 13 e Storage em 11 (arquivos de teste excluídos).
6. Segundo ensaio transacional, excluindo **somente no arquivo temporário de teste** a FK externa e tolerando o schema `public` já existente: as 72 tabelas e seus demais objetos foram criados sem erro; o comando final executou `ROLLBACK`. Esse ensaio não valida os dados, o comportamento das funções nem a API do app.
7. Data API do Neon habilitada sem Neon Auth e sem concessão automática de acesso às tabelas. Endpoint: `https://ep-misty-star-beg2irkr.apirest.c-9.us-east-2.aws.neon.tech/neondb/rest/v1`.
8. Estrutura persistida no reserva, ainda sem registros: 72 tabelas públicas. A estrutura exata da tabela de referência `auth.users` foi exportada da origem e recriada em `reserve_auth.users`, com a FK de `public.usuarios` apontando para ela; isso evita conflito com o schema `auth` gerenciado pela Data API. Não foi implementado nem simulado o serviço Supabase Auth.
9. Importação confirmada com `COMMIT`; conferência posterior: zero tabelas públicas legíveis por `anonymous` e zero funções públicas executáveis por `anonymous`. Grants de tabelas, sequências e funções foram revogados de `PUBLIC`, `anonymous` e `authenticated`; funções futuras também não recebem EXECUTE de PUBLIC por padrão. Nenhum registro ou PDF foi copiado nesta etapa.
10. Consulta agregada na origem: banco de Preview com 18 MB, Storage com 123 objetos e aproximadamente 25 MB. Object Storage do Neon está disponível no projeto/região; credencial privada e buckets ainda não foram configurados.

## Compatibilidade a concluir

O cliente atual de `backend/src/config/supabase.ts` usa a API Supabase. Uma URL PostgreSQL do Neon não pode substituir `SUPABASE_URL`.

- API compatível com consultas, relacionamentos e RPC, com acesso exclusivo do backend; nenhuma chave administrativa no app.
- Adaptador de armazenamento privado para faturas, contratos e anexos, incluindo URLs assinadas de upload e download. O Object Storage do Neon possui API S3; ele não implementa diretamente a API Supabase Storage usada pelo código atual.
- Réplica inicial consistente e sincronização contínua com atraso verificável. Exportar schema não replica os registros nem os PDFs.
- Executor único e bloqueio de escritas em caso de réplica atrasada ou estado incerto. O controle de executor não pode depender apenas do banco que caiu.
- Reconciliação no retorno e prevenção de repetição de cobranças, notificações, protocolos e tarefas.
- Conexão de serviço persistente por segredo privado: o login interativo usado no ensaio não serve como credencial de produção.

## Critérios para habilitar

Validar primeiro no Preview: login e revogação de sessão, isolamento entre empresas, clientes/UCs, leitura e gravação transacional, RPCs, PDFs privados, indisponibilidade da origem, sincronização e retorno. Não executar pagamentos nem protocolos Cemig nesses testes. Enquanto faltarem essas verificações, manter o Supabase como banco ativo.

O backup descrito em `backup-supabase.md` é uma rotina de recuperação separada: não é replicação nem failover online e ainda não tem destino externo configurado.

## Sincronização validada em 5 de novembro

- Restauração completa em andrade_preview_restore_full_20261105. As 72 tabelas tiveram suas contagens conferidas na transação, incluindo 8 usuários, 3 clientes e 10 UCs.
- Render de homologação publicou b2fc3c68. O build copiou 433 registros para andrade_preview_restore_probe. A rotina do servidor executou novamente e copiou 435 registros, incluindo novas linhas da origem.
- NEON_SNAPSHOT_ENABLED=true executa a cópia a cada 15 minutos enquanto o servidor está disponível. O intervalo não constitui garantia de atraso máximo quando o serviço gratuito estiver suspenso.
- A função de exportação é SECURITY INVOKER, acessível apenas a service_role. Valores bigint/numeric seguem como texto JSON até o Postgres de destino.
- O destino usa lock transacional e marcador privado em reserve_control.snapshot_state. Só aceita cópia em modo standby. Falhas restauram os dados, vínculos, rotinas, triggers e marcador anteriores.
- Treze testes passaram em PostgreSQL 18 local e com armazenamento simulado, incluindo relações circulares, rollback, precisão numérica, mudança de versão e corrupção de arquivo.
- O bucket Neon andrade-preview-documentos foi criado como Private. O manifesto atual do Supabase contém 122 arquivos, 27.506.942 bytes, todos com identificador de versão.
- A cópia de arquivos depende de NEON_STORAGE_SNAPSHOT_ENABLED=true e das credenciais privadas. Cada conteúdo recebe chave por SHA-256, é relido do destino e conferido. O manifesto só é publicado junto com a transação do banco. Blobs recém-criados numa execução revertida ficam inacessíveis pelo manifesto e não são apagados automaticamente.
- storage_ready=false significa que aquela captura ainda não foi validada com os documentos.
- Continuam pendentes a conexão administrativa/API do app ao Neon, a adaptação das URLs privadas dos arquivos e o controle de troca e retorno que impeça dois bancos de receber gravações. Conferir essas etapas antes de apontar os apps ao Neon.
