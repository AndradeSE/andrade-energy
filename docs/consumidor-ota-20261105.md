# Consumidor: recuperação das melhorias na OTA

## Causa

O pacote `dist-splash-production`, usado na correção de abertura, continha fontes antigas de `app/selecionar-unidade.tsx`, `app/clientes/faturas-anexadas.tsx` e `components/cliente/ClienteHome.tsx`. A abertura foi corrigida, mas a publicação reintroduziu telas anteriores sem os ajustes completos de solicitação de UC.

Não reutilizar esse diretório para publicar.

## Correção

- Pacote exportado novamente a partir da fonte completa deste worktree.
- Espaçamento externo entre o botão de solicitar UC e a busca.
- Campo de senha do PDF sempre visível, com placeholder curto e explicação que quebra linha abaixo.
- Remover PDF antes do envio e excluir PDF já enviado preservados.
- Localização rural/urbana, atalhos e histórico de leituras preservados.
- Separação entre faturas Cemig e solicitação de nova UC preservada.
- Correção da imagem de abertura preservada em `ContractAccessGate` e `_layout`.

## Publicação segura

Projeto EAS Consumidor: `45f35f6f-4f6a-4452-b2e4-02932e778b2b`.

Utilizar `scripts/publish-consumer-verified.ps1` com PowerShell 7 (`pwsh`), mantendo a publicação sequencial. O script confere projeto e runtime, exporta em diretório novo e compara nove fontes da source map com o código local antes de enviar. `scripts/verify-consumer-ota.cjs dist-splash-production` recusou o artefato antigo, como esperado; os pacotes novos passaram.

```powershell
./scripts/publish-consumer-verified.ps1 -Stage preview -Target refresh
./scripts/publish-consumer-verified.ps1 -Stage production -Target refresh
./scripts/publish-consumer-verified.ps1 -Stage production -Target universal
./scripts/publish-consumer-verified.ps1 -Stage production -Target voice
```

Preview recebe somente `1.0.11-preview-refresh-fixed`. Produção mantém `1.0.11-production-refresh-fixed`, `1.0.10-production-arm32` e `1.0.4-production-live-awake`. O runtime antigo `1.0.0` não recebe este pacote com módulos nativos de voz; não renomear runtime para forçar compatibilidade.

Validação: TypeScript sem erros, `git diff --check`, comparação das nove fontes nos bundles e consultas ao endpoint de distribuição Expo usando canal/runtime de cada destino. Nenhum APK novo foi compilado nesta correção. A entrega pelo Expo foi verificada; a aplicação no aparelho do usuário não foi observada nesta rodada.

## IDs finais confirmados

| Canal | Runtime | Grupo | Update Android |
| --- | --- | --- | --- |
| preview-consumidor | 1.0.11-preview-refresh-fixed | 5c81e933-5eaf-49dd-a387-ee4343c6c550 | 01a1ad25-079e-7c90-ba1b-6786f61e7046 |
| production-consumidor | 1.0.11-production-refresh-fixed | c938e03c-8e10-43a5-9ae3-032a899f2a16 | 01a1ad26-0391-711b-93ef-009773daae47 |
| production-consumidor | 1.0.4-production-live-awake | 7ded090c-90ac-4471-b254-e93112b786dc | 01a1ad23-75cf-7d06-935e-b276ee6597de |
| production-consumidor | 1.0.10-production-arm32 | 345b0dff-c43c-4bbc-bce6-5aad541f747b | 01a1ad27-0133-7949-9ee6-94a9ad16b789 |
