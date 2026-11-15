# Solar — sincronização das consultas na web

Esta rodada transferiu para o portal:

- Consumo médio cadastrado separado do consumo da última competência; valor ausente não vira zero.
- Histórico de autoleituras por UC autorizada, usando endpoint próprio do Consumidor. Recebimento não é confirmação de protocolo Cemig.
- E-mail, telefone e endereço na consulta de perfil.
- Retomada de uma UC mencionada em resposta anterior na mesma conversa; referências ambíguas não escolhem UC e identificador explícito novo prevalece. A troca de conta/seleção desmonta a conversa pelo escopo já usado pelo portal. Não armazena histórico privado no navegador nem o envia ao modelo online.
- Consulta de consumo/economia por UC explícita revalidada na lista de unidades próprias.
- Bloqueio de administração no Consumidor antes da consulta, mesmo com configuração de seções inconsistente; ambientes do Gerador consultados por `/empresas/minhas`.

O botão de exclusão de empresas também está implementado na web no commit 8b4646c8; sua publicação depende da migração descrita em `empresas-parceiras-exclusao.md`.

## Evidência

78 testes da web passaram, incluindo sete novos cenários de consulta/contexto. Build de produção Vite/TypeScript passou, assim como TypeScript do app após a integração. O executor dos testes web usa tsx com versão fixada para resolver os módulos TypeScript compartilhados com o app. O teste de orientação de cobrança diferencia corretamente os cinco dias antes do vencimento das etapas de cobrança após o vencimento, já descritas no guia compartilhado.

Ainda não houve publicação nesta rodada nem conferência autenticada dessas alterações no navegador. Não declarar equivalência de todos os fluxos nativos: câmera, reconhecimento de voz e abertura/compartilhamento reais de cada documento exigem conferência própria do portal.

## Tentativa de publicação na conta correta

O projeto preservado é `appgprj_6a8c66b15ba48191baad8777fd2d1eba` (Portal Andrade Energy, URL de plataforma `https://andrade-energy.anacarolinesantos73.chatgpt.site`, versão pública consultada 110). `get_site` retorna metadados públicos, mas sem papel/acesso de edição na conexão atual. `create_source_repository_write_credential` e `list_custom_domains` retornaram NOT_FOUND. A conexão lista como próprio apenas o projeto diferente `appgprj_6a8dde88c4548191ac12362f730720a6`, da conta jpmuller.contabil; esse projeto não foi alterado nem usado como destino alternativo.

Publicação autorizada pelo usuário, porém pendente da reconexão à conta correta ou da concessão de acesso ao projeto. Não alterar ID, audiência ou domínio para contornar essa falta de acesso. Para publicar exclusão de empresas, concluir antes a migração/API conforme `empresas-parceiras-exclusao.md`.
