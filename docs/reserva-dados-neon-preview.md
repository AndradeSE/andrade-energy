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

## Conferência em 6 de novembro de 2026

- GET /health da homologação confirmou online, Preview, release 94f518c72fee8394c76b3ca36971ac9d3aa19801.
- O build exige o teste da API privada: contagens de clientes/usinas/UCs/contratos/faturas, relacionamento, RPC de tamanho e recusa de acesso anônimo.
- Também exige baixar um documento do manifesto por URL assinada, conferir SHA-256/tamanho e recusar a mesma URL sem assinatura. A publicação online confirma a conclusão desses passos obrigatórios.
- A cópia privada anterior foi conferida com storage_ready=true, 122 documentos e 72 tabelas. O executor continua RENDER; o app continua usando Supabase.
- Escolha de segurança para a próxima etapa: recuperação inicialmente somente de leitura; não habilitar gravações a partir de uma cópia com atraso sem reconciliação e exclusão de executor. A autorização genérica para escolher o melhor comportamento não torna seguro repetir efeitos financeiros.
- Push de troca e indicação de banco ativo nas cotas precisam acompanhar uma transição efetiva e persistida. Não emitir push a cada snapshot nem anunciar Neon ativo enquanto o app não o utiliza.
- Pendências: adaptador do app para recuperação, proteção das rotas GET com efeitos colaterais, sessão/revogação e isolamento, status autenticado nas cotas, evento durável de troca, ensaio de indisponibilidade/retorno e eventual preparação separada de produção.

## Recuperação integrada e OTA do Preview — 06/11/2026

- Backend 0d0e1f70, 221c4dbe e 3d4f6fdc foram confirmados online por /health no ambiente Preview. Os testes de build exercitaram recuperação com sessão temporária no Neon, autenticação obrigatória, escopo de empresa, revogação, ausência de renovação de sessão e bloqueio de mutações. Nenhuma sessão foi criada no Supabase e os registros temporários são removidos ao concluir.
- NEON_RECOVERY_READ_ONLY=true seleciona o adaptador de consulta apenas no Render Preview. O padrão permanece false. Rotas HTTP são permitidas por lista explícita: não presumir que todo GET é inofensivo. RPCs não autorizadas e escritas REST são bloqueadas; o PostgREST privado sempre termina as transações com rollback.
- PDFs são consultados pelo manifesto privado. O adaptador não oferece upload, usa URL assinada por 60 segundos e verifica hash/tamanho ao baixar o conteúdo.
- Cópias acima de 20 minutos, futuras, sem documentos conferidos ou com modo de escrita/revisão são recusadas. Esta é uma recuperação limitada de consultas; não constitui continuidade completa de escrita nem garante disponibilidade durante uma queda longa da origem.
- Jobs, ingressos de webhook, controles de execução e operações financeiras ficam desativados no modo de consulta. Novos logins, troca de empresa e logout remoto também são bloqueados; somente sessões existentes válidas na cópia são consultadas. Revogações posteriores à captura só serão conhecidas quando houver nova cópia.
- reserve_control.recovery_instance e recovery_notice mantêm o histórico de mudanças por instância, fora das tabelas replicadas. Avisos são criados na transição efetiva, após a porta HTTP iniciar; reiniciar na mesma situação ou atualizar snapshot não cria outro aviso. O build confere entrada, repetição e retorno com entrega externa desligada.
- O aviso é gravado no Supabase quando ele responde e permanece no histórico privado durante recuperação. A tentativa de push usa apenas dispositivos Gerador de administradores ativos da empresa Andrade. Uma resposta incerta não é repetida em cada reinício; histórico não equivale a comprovante de recebimento do push.
- /api/reserva-dados/status exige sessão. /api/cotas-servicos inclui reservaDados com banco ativo, modo, última cópia, prontidão de documentos e ausência de troca automática. Não inventa limites de consumo do plano Neon.
- OTA do Gerador Preview confirmada pelo Expo: canal preview-gerador, runtime 1.0.12-preview-pdf-voice, grupo 8252a118-0905-49b9-93ad-f202d3d2998f, update Android 01a1b038-d6f7-7783-a15b-5674061c0678. Card preparado na fonte nativa, commit local f3ba77a5. Bundle inclui o estado de trabalho já existente; não se deve reproduzi-lo usando apenas o commit antigo que o Expo mostra com asterisco.
- Não houve APK novo, OTA de produção, migração de produção ou ativação do Neon como banco ativo. Para um fallback completo ainda faltam controle de escritor independente da origem, reconciliação das alterações, ensaio de indisponibilidade prolongada e preparação explícita do destino de produção.

Conferência final desta etapa: /health confirmou 0b51ace658e623a34b6c5e1fad3519debbb95c5f online no Preview. Esse build completou também o download e a URL assinada pelo novo adaptador de arquivos. Consulta pública a /api/reserva-dados/status recebeu HTTP 401, como esperado. Recuperação segue opt-in desativada no serviço; não houve ensaio da troca do serviço HTTP inteiro, ativação automática, nem preparação de produção. Controle do navegador indisponível nesta sessão por falha do kernel da ferramenta.
