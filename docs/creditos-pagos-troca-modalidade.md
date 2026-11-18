# Créditos quitados na troca de injeção para compensação

## Comportamento

- A troca pela configuração da UC confere o histórico antes de salvar. Rascunhos de injeção, saldos faturados ainda não quitados, competências faltantes ou dados incompletos exigem conferência.
- O estoque pago é reconstituído exclusivamente das faturas de injeção quitadas, da compensação posterior e do saldo da distribuidora. Saldo da distribuidora sozinho não prova pagamento.
- O abatimento é em kWh, preservando o pagamento original mesmo que tarifa ou desconto mudem depois. O estoque não migra para outra UC/cliente/empresa.
- Cada nova fatura por compensação preserva os kWh compensados e registra em `dados_extraidos.creditos_pre_pagos` o saldo anterior, utilizado, restante, base cobrável e versão do histórico.
- A energia já quitada sai da base da nova cobrança. Concessionária e encargos permanecem conforme configuração existente. Não há boleto nem cobrança local de valor zero.
- A reserva inclui rascunhos para não reutilizar o mesmo saldo. Reimportação preserva faturas quitadas e demonstrativos já emitidos. Cancelamentos liberam reservas; não há estorno/reembolso automático de cobranças antigas.
- O encerramento desconta os créditos já pagos antes de cobrar o saldo remanescente.
- O relatório de cálculo apresenta uma página com o abatimento e saldo remanescente.

## Banco e concorrência

Aplicar `supabase/migrations/20261118133723_creditos_pagos_modalidade.sql` junto do backend. São funções invocadoras, acessíveis somente a `service_role`; nenhuma permissão pública de faturamento foi ampliada. A emissão usa trava transacional por empresa/UC e confere uma impressão do histórico imediatamente antes de inserir. Se houver outra emissão ou mudança de pagamento, o cálculo antigo é rejeitado.

Não aplicar isoladamente em produção: o backend antigo não fornece o demonstrativo exigido pelo novo gatilho para UCs com histórico de injeção. Não publicar APK/OTA para esta alteração de backend.

## Validação local

- TypeScript, suíte geral do backend e `npm run test:creditos-pagos`.
- `backend/scripts/test-creditos-pagos-sql.cjs`: SQL real em PostgreSQL embarcado, fixtures isoladas; verifica defaults, inserção, token obsoleto, pagamento alterado, isolamento e permissões. A trava nativa de transações é substituída por stub nesse teste single-connection, portanto concorrência real deve ser conferida na homologação antes de produção.
- PDF real gerado, texto extraído e página do abatimento renderizada/conferida visualmente.

## Estado

Implementação e testes locais. Migração e backend ainda não publicados. Nenhum saldo, pagamento, contrato ou fatura real foi alterado. Pagamentos externos ausentes no histórico precisam ser conciliados; não presumimos que todo crédito acumulado já foi quitado.
