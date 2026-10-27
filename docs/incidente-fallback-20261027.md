# Incidente: cota Render e roteamento dos apps ‚Äî 27/10/2026

## Causas verificadas

- O principal respondeu HTTP 503. O monitor consultou o servi√ßo de produ√ß√£o e confirmou `BILLING` em tr√™s observa√ß√µes.
- O reserva implantado identificou `4076df57`, mas o banco aprovava `e863b1a8`. A prote√ß√£o de vers√£o impediu a troca.
- As publica√ß√µes recentes dos apps tinham retornado ao resolvedor que reconhecia somente Render principal e Netlify, perdendo o destino Render reserva.

## Recupera√ß√£o executada

Comparado `e863b1a8..4076df57`: nenhum arquivo de backend, package.json ou lockfile mudou; apenas documenta√ß√£o, Metro e hist√≥rico. A aprova√ß√£o da revis√£o implantada foi atualizada com guarda de concorr√™ncia e auditoria. O monitor normal realizou a troca, sem forjar observa√ß√£o nem invocar opera√ß√£o financeira.

√Äs 18:09:09 UTC, o banco confirmou `RENDER_RESERVA`, revis√£o 3, resultado `RENDER_RESERVA_ATIVADA`. √Äs 18:10 UTC, tarefas de push, notifica√ß√µes, produ√ß√£o por e-mail, faturas por e-mail, convites e rateio foram conclu√≠das pelo reserva. Requisi√ß√£o sem autentica√ß√£o a clientes retorna 401, preservando controle de acesso.

Restaurados resolvedor dos tr√™s destinos fixos, leitura de metadados por GET, invalida√ß√£o do cache diante de executor inativo e servi√ßo administrativo que respeita reserva preferida. Nenhuma requisi√ß√£o de neg√≥cio √© repetida automaticamente. Cinco testes, TypeScript e consulta real do resolvedor passaram.

## Limites

A cascata entre os dois reservas continua adiada at√© liberar Netlify. Este incidente n√£o a ativou. Render Free pode dormir; o controle admite tempo de despertar, sem prometer troca instant√¢nea. N√£o retornar ao principal automaticamente quando recuperar cota. N√£o aprovar novos commits do reserva sem comparar e validar o artefato publicado.

Publica√ß√µes e IDs finais registrados no checkpoint externo e no hist√≥rico OTA.


## ConferÍncia final de 27/10

O titular confirmou que o Gerador Preview voltou apÛs instalar o APK atualizado. As quatro URLs est·veis de APK foram substituÌdas com verificaÁ„o de tamanho/SHA-256, preservando backups; os quatro downloads responderam HTTP 200. OTAs de correÁ„o da sess„o foram publicadas para Gerador e Consumidor Preview e para Gerador Preview com navegador nativo.

A web de produÁ„o foi publicada e aponta temporariamente ao Render reserva. A web Preview ainda responde 503 porque o conector Sites n„o encontra o projeto existente. N„o criar outro site nem considerar o Preview web resolvido.

A sincronizaÁ„o de mÛdulos no reserva de produÁ„o j· foi implantada no commit ebd57bdf e aprovada apÛs conferÍncia. Uma atualizaÁ„o posterior de qs est· preparada e validada, mas ainda n„o implantada. O navegador est· desativado nesta sess„o e n„o h· conector Render disponÌvel.

O navegador Cemig integrado continua experimental, somente no Gerador Preview. O envio definitivo autom·tico e sua confirmaÁ„o de protocolo n„o est„o validados. A cascata Netlify permanece aguardando 1∫/11/2026 ‡s 9h, conforme agendamento; n„o ativ·-la antes.
