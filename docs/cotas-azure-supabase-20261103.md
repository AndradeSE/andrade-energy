# Cotas Azure e Supabase

Relato: Azure não atualiza e Supabase ausente. Encontrado no código: GET só lia snapshots; catálogo Azure dependia de variáveis da instância que respondia (ocultava no reserva); não existia coletor Supabase.

Correção preparada:
- GET ADM renova automaticamente as consultas, single-flight e intervalo de cinco minutos por processo, preservando snapshots quando houver falha.
- Azure continua visível com estado de consulta/configuração, sem inventar zero. A consulta ainda exige credenciais e RBAC válidos no executor; não foi possível inspecionar a configuração online nesta sessão.
- Supabase consulta apenas `pg_database_size(current_database())` pela RPC restrita a service_role; mostra MB, sem confundir banco com Storage/tráfego.
- Limite do Supabase só aparece se `SUPABASE_DATABASE_LIMIT_BYTES` tiver sido confirmado. Sem esse valor, mostra consumo e informa limite não confirmado; não assume plano gratuito.
- Migração necessária: `20261103100000_cotas_tamanho_banco.sql`, primeiro Preview.
- Não publicar apenas a tela e declarar resolvido. Aplicar migração, deploy Preview, conferir leitura/credenciais Azure e só depois promover aos servidores produção/reserva e OTA.

Testes específicos Azure/política: oito aprovados. Compilação completa backend inicialmente bloqueada pelas dependências da raiz. Corrigida a resolução local com junction para o node_modules existente de `andrade-energy/backend`, TypeScript completo aprovado, sem instalar dependências novas. Sem deploy ou migração aplicados nesta etapa.

Consulta real ao projeto de produção `ehnkyrsseisvvtbkwrvu`, em 03/11: Azure status `SEM_DADOS_COMPLETOS`, consultado em `2026-11-03T11:18:38.065Z`. Única leitura salva: 3987 caracteres de outubro, vencida em `2026-11-01T00:00:00Z`; não deve ser apresentada como novembro. Não há evidência para afirmar zero de consumo nem falha de autenticação. A RPC de tamanho do banco retorna PGRST202 (migração ainda não aplicada). Ferramentas de navegador e Computer Use falharam ao iniciar com `failed to write kernel assets`; não há conector Render/Supabase nesta sessão. Publicação online pendente por falta de canal de controle, não por testes reprovados.

Referências: https://supabase.com/docs/guides/platform/database-size e https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cognitiveservices-accounts-metrics

## Publicação real em 03/11

Após reset do controle do navegador, acesso recuperado. Migração aplicada ao Preview e à produção; leitura restrita retorna 19057811 bytes no Preview e aproximadamente 22170771 bytes em produção. Somente service_role tem EXECUTE; anon/authenticated sem acesso.

Portados apenas os arquivos de cotas para as branches atuais dos backends, preservando correções mais recentes (inclusive Azure client dedicado, Browserbase no Preview e CapMonster em produção):
- Preview `2ca5b6a27b2224fe7c3ecc502de8b1a076dd5905`, branch `codex/render-reserva-preview-20261024`.
- Produção `efe7e7e1a20f9f5c2c50520158cc7335de185d36`, branch `codex/render-reserva-producao-20261024`.
- Deploy automático Live confirmado no Render principal e reserva; Netlify /health confirmou mesma revisão efe7e7e. Preview principal/reserva confirmaram 2ca5b6a.
- Commits aprovados nos controles dos dois bancos, executor RENDER e revisão preservados. Teste de reserva/finalização de requisição de diagnóstico retornou true, sem operação financeira.
- Coletor executado e DTO confirmado em produção: SUPABASE status OK, banco_bytes=22170771, limite não confirmado. Azure SEM_DADOS_COMPLETOS, sem leitura de novembro; não foi inventado consumo zero. Nenhum limite do plano Supabase presumido.
- Endpoint principal sem sessão devolve 401, conforme esperado.

Durante a conferência o usuário relatou push de leitura da usina/Gmail desconectado. Logs do principal: OAUTH_REAUTORIZACAO na etapa AUTORIZACAO às 09:42 e 09:43 (São Paulo). Conexão 88a8f6ec... / UC geradora 1121361801894 voltou a LEITURA_AUTORIZADA/ATIVA às 09:48. **Usuário confirmou que foi ele quem reconectou**: não atribuir a volta a recuperação automática. A causa específica da invalidação Google não foi comprovada. O projeto padrão aberto no Cloud não foi validado como o cliente OAuth do backend, portanto não afirmar que modo Testando é a causa nem alterar esse projeto. Credenciais novas preservadas.
