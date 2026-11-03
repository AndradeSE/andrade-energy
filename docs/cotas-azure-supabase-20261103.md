# Cotas Azure e Supabase

Relato: Azure não atualiza e Supabase ausente. Encontrado no código: GET só lia snapshots; catálogo Azure dependia de variáveis da instância que respondia (ocultava no reserva); não existia coletor Supabase.

Correção preparada:
- GET ADM renova automaticamente as consultas, single-flight e intervalo de cinco minutos por processo, preservando snapshots quando houver falha.
- Azure continua visível com estado de consulta/configuração, sem inventar zero. A consulta ainda exige credenciais e RBAC válidos no executor; não foi possível inspecionar a configuração online nesta sessão.
- Supabase consulta apenas `pg_database_size(current_database())` pela RPC restrita a service_role; mostra MB, sem confundir banco com Storage/tráfego.
- Limite do Supabase só aparece se `SUPABASE_DATABASE_LIMIT_BYTES` tiver sido confirmado. Sem esse valor, mostra consumo e informa limite não confirmado; não assume plano gratuito.
- Migração necessária: `20261103100000_cotas_tamanho_banco.sql`, primeiro Preview.
- Não publicar apenas a tela e declarar resolvido. Aplicar migração, deploy Preview, conferir leitura/credenciais Azure e só depois promover aos servidores produção/reserva e OTA.

Testes específicos Azure/política: oito aprovados. Compilação completa local backend bloqueada pelo ambiente de dependências (express-rate-limit, serverless-http, pdfkit etc. ausentes e tipos Express incompatíveis em módulos existentes); não foi declarada aprovada. Sem deploy ou migração aplicados nesta etapa.

Referências: https://supabase.com/docs/guides/platform/database-size e https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cognitiveservices-accounts-metrics
