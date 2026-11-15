# Solar — matriz própria do app do Cliente

A validação do Gerador não substitui a do Consumidor. Esta matriz separa testes controlados de conferência autenticada no aparelho. Não publicar uma conclusão geral de ponta a ponta para o Cliente sem fechar as etapas de aparelho abaixo.

| Jornada | Aceitação | Evidência atual |
| --- | --- | --- |
| Perfil | Consultar pelo ambiente CONSUMIDOR; edição com revisão e confirmação | Consulta automatizada; edição de perfil conferida no Gerador, falta repetir no Cliente |
| UC | Listar apenas próprias, trocar pelo fluxo do app e atualizar contexto | Troca real Casa → UC 453314201850 conferida no Cliente; elegibilidade rural e contexto da Solar acompanharam a troca |
| Consumo | Distinguir média cadastrada de consumo da última competência | Integração automatizada; no S23, Solar retornou média cadastrada de 416 kWh e informou ausência de última fatura sem reutilizar essa média |
| Economia | Consultar dashboard da UC própria selecionada; não assumir zero sem dados | Integração automatizada de alvo e ausência de UC autorizada |
| Contrato | PDF da UC selecionada, compartilhamento e retorno preservados | PDF/proposta de Casa aberto no aparelho; resolução automatizada; compartilhamento e retomada por voz pendentes |
| Faturas | Documento Andrade e Cemig conforme cobrança unificada; não exibir campos de pagamento no demonstrativo | Conferência específica da política de documentos pendente nesta rodada do Cliente |
| Autoleitura | UC elegível; câmera, galeria e PDF; extração, ilegibilidade, envio e histórico | Câmera integrada/flash e foto ilegível conferidos, sem leitura inventada ou envio; histórico com UC preservada validado em homologação e produção. Extração positiva e envio ainda pendentes |
| Privacidade | Consultar somente os próprios pedidos; não emitir ou excluir por uma consulta | Integração automatizada sem escrita |
| Voz e memória | Chamar Solar, abrir PDF, voltar, encerrar, reabrir e retomar a mesma UC | Confirmado no Gerador; repetir no Cliente e após trocar UC |
| Configurações e versão | Preferências e notas do Consumidor, respeitando autorizações | Cobertura compartilhada; conferência própria no Cliente pendente |
| Permissões | Sem clientes de terceiros, Comercial, carteiras, rateio ou administração | Bloqueio de módulos administrativos testado |
| Login e isolamento | Sair/entrar, não reutilizar memória de outra conta e não acessar UC alheia | Isolamento de histórico compartilhado testado; sequência autenticada do Cliente pendente |

Os novos testes usam os detectores, despachantes e seletores reais com serviços autenticados simulados. Não comprovam câmera, OCR, reconhecimento de voz ou chamadas reais do backend. A baseline do Consumidor continua obrigatória antes de qualquer OTA ou APK; não atualizar hashes para contornar falhas.

## Histórico conferido no S23 em 15/11/2026

APK local isolado `com.andradese.energy.consumidor.localqa` instalado no S23. SHA256 `7266E227AA5AA9E8A556CA4C9EA83596C251EC9175B5A83F915F6C9108AB4771`. Firebase omitido apenas neste pacote local, cuja finalidade é testar o fluxo de navegação. O usuário entrou com a conta de homologação diretamente no aparelho.

Pela lista de unidades, Informar leitura do medidor da UC 1204584501840 abriu Autoleitura. Histórico de leituras e protocolos abriu com UC 1204584501840 no cabeçalho e retornou Nenhuma leitura registrada para esta UC. A perda de contexto foi reproduzida anteriormente e o caminho corrigido foi conferido no aparelho. TypeScript e export Android local passaram. Após revisar o diff, foi atualizado somente o hash de app/autoleitura.tsx na baseline. Os outros cinco hashes foram preservados. Publicação oficial em Preview e produção acompanha esta conferência, sem substituir instaladores de produção pelo pacote local.

## Conferência adicional autenticada no S23

Na instalação local, a troca pela lista para UC 453314201850 atualizou a Home e removeu a ação rural de autoleitura, conforme a elegibilidade dessa unidade urbana. Na Solar, a pergunta "Qual o consumo medio da minha unidade?" retornou UC 453314201850, média mensal cadastrada de 416 kWh e distinguiu explicitamente esse cadastro do consumo da última fatura. O campo permaneceu visível acima do teclado durante a digitação. A compilação Gradle finalizou com BUILD SUCCESSFUL (1124 tarefas).

Preview oficial publicado: grupo d9d75317-4ad6-4a0a-ad90-b0725b3bef68, Android 01a1df03-3f1f-7247-8eae-71cf66f185cf, runtime 1.0.11-preview-refresh-fixed. A conferência autenticada desta OTA oficial ainda está em andamento; não há promoção de produção registrada nesta etapa.

## Publicação de produção em 15/11/2026

A correção específica do histórico foi promovida após o teste autenticado do mesmo código no APK local de homologação. A OTA oficial Preview foi publicada, mas sua sessão estava no login; não foi atribuída a ela uma validação autenticada que não ocorreu. A matriz completa acima continua contendo pendências, especialmente voz real e envio positivo de autoleitura.

Produção atual: runtime 1.0.14-production-consumidor-camera, grupo 8e78845e-df62-47bc-91ce-ca161dd28a0f, Android 01a1df08-ec09-71b3-8aca-0052abc6b378. Endpoint u.expo.dev do projeto Consumidor retornou HTTP 200 e o ID publicado para o canal production-consumidor. Não houve troca de APK nem de manifesto de aviso nativo.

Após sair da Solar e reabri-la na instalação local, "E qual o consumo da ultima fatura dessa UC?" informou ausência de fatura. O botão Abrir contas de luz abriu o estado vazio correspondente. A ausência de documentos foi conferida sem criar dados ou usar o valor médio como consumo faturado.

Conferência na instalação oficial de produção do S23: a sessão anterior reproduziu a perda da UC no histórico. Após fechar pelos aplicativos recentes e reabrir, o mesmo caminho pela lista, Informar leitura e Histórico mostrou UC 720670501839 e Nenhuma leitura registrada para esta UC. Nenhum valor de leitura foi digitado ou enviado. A correção da navegação foi, portanto, confirmada também na instalação de produção após carregar a OTA.

Compatibilidade publicada e conferida por HTTP 200 no endpoint Expo, com correspondência dos IDs: 1.0.11-production-refresh-fixed (01a1df0a-7aaa-73f6-be62-f216761e27f3), 1.0.10-production-arm32 (01a1df0b-dffc-76ce-b4dc-89b868ed0c4b) e 1.0.4-production-live-awake (01a1df0d-451a-7bd6-a760-cf4a8324a05f). Canais preservados. Ao concluir esta publicação, o tempo de tela do S23 foi restaurado e confirmado em 30000 ms.

## Conferências e ajuste da chamada por voz

O usuário confirmou que a chamada anterior abriu com dificuldade e informou o consumo. Solicitou em seguida a frase E aí, Solar. A revisão 10a56a36 foi conferida em Sobre o app da instalação local de homologação; a chamada completa não abriu no teste do usuário. Essa revisão não foi promovida para produção.

A captura rápida tinha limite de pausa de 240 ms e trecho de dois segundos. O ajuste seguinte preserva 500 ms de pausa e até três segundos na chamada rápida. Teste com PCM e pausa intermediária de 320 ms confirmou uma única captura; nome isolado e menções em frases longas continuam rejeitados. O diagnóstico de transcrição fica disponível somente no Preview. TypeScript aprovado.

Na UC de homologação Casa, uma imagem sintética identificada como AMOSTRA DE TESTE retornou exatamente 012345 pelo serviço real de extração. A tela exibiu Leitura reconhecida e bloqueou o registro por ausência de período de leitura. Nenhuma leitura fictícia foi enviada. Isso confirma importação de imagem e extração controlada, mas não confirma foto de medidor físico nem envio com janela aberta.

O usuário cancelou a frase longa após o reconhecimento incorreto e pediu retorno à versão funcional com apenas Solar. Foram restaurados do commit anterior ao experimento os cinco arquivos da ativação (matcher, captura local, menu, orientação e mensagem da conversa). Os testes agora aceitam somente a chamada Solar e as grafias fonéticas restritas anteriores; saudações continuam rejeitadas. As telas protegidas e a correção do histórico não foram revertidas. Nenhuma OTA do experimento E aí Solar foi publicada em produção. Restauração dos Previews em andamento.

O usuário confirmou que a revisão restaurada 0d6fbaa1 abriu a conversa ao dizer Solar. A cópia local com package com.andradese.energy.consumidor.localqa foi desinstalada após ele apontar dois ícones de Preview. Foi preservado com.andradese.energy.consumidor.preview, além dos dois apps de produção e Gerador Preview. O pacote extra tinha identificador separado para teste; não foi distribuído como APK oficial nem usado para substituir o certificado do Preview.

## Clima da UC e inatividade — 15/11

Card inicial do Consumidor passou a mostrar a condição e temperatura do endpoint próprio da UC. Usa o mesmo PlantRain da usina; somente resposta disponível, temperatura finita e referência com menos de 70 minutos permitem efeito de chuva. Informação expirada é reavaliada por minuto; sem dado, mostra Clima indisponível. Não usa animação como substituto de clima. A foto personalizada é preservada.

Na instalação Preview oficial autenticada, após carregar a OTA 01a1df34-c3e0-7bea-a95d-fd18ca588dc0, o card Casa mostrou Parcialmente nublado · 23°C sem chuva. A conferência identificou proximidade entre etiqueta e identidade; posição ajustada de 68 para 44 pontos e nova publicação Preview iniciada. Chuva real não foi forçada no backend.

O prazo de inatividade passou de cinco para dez segundos em app/assistente.tsx e no Gemini Live; o texto de consentimento foi alinhado. Não conta período de resposta nem ferramenta em execução. 45 testes de integração/matcher passaram e TypeScript passou. Ativação continua somente Solar. A matriz de ponta a ponta ainda não deve ser tratada como integralmente concluída.

Conferência final no Preview oficial: a etiqueta reposicionada apareceu entre o status e a identidade, sem sobrepor Minha unidade. Clima exibido Parcialmente nublado · 23°C, sem chuva. Gemini Live no S23: microphone-ready às 09:43:52.290 e encerramento por inatividade às 09:44:02.440, seguido de socket-close 1000 e retorno à Home. Isso confirma 10,15 segundos de escuta sem fala após a resposta, sem contar a resposta como inatividade.

Consultas adicionais no Preview oficial: Consulte meu perfil retornou nome/e-mail/endereço da própria conta e telefone não informado, sem inventar número. A proposta comercial da UC Casa abriu PDF correto no visualizador e exibiu opções de compartilhamento; cancelado sem enviar. Pedido Abra meu contrato ainda abriu a aba Meu contrato, sem abrir automaticamente o PDF. Este desvio do agente foi identificado e permanece pendente; não marcar o módulo documental ponta a ponta como concluído.

## Lote consolidado solicitado pelo usuario

O usuario confirmou o encerramento por aproximadamente 10 segundos. A rodada anterior ja em andamento terminou: camera 01a1df3e-e359-7593-9ebf-7385a0ee219d, refresh 01a1df40-8982-7235-a512-d637167d636e, arm32 01a1df41-f3f4-749e-8a8e-df0166ec67b4, live 01a1df43-7a17-7ddf-8c9a-e0177ade8c52, gerador 01a1df44-e8e4-7009-883e-373863ffdc4e. Os cinco endpoints Expo retornaram HTTP 200 e o ID correto do respectivo projeto/runtime/canal. Nenhum APK ou aviso nativo foi substituido.

Proximas alteracoes ficam acumuladas ate concluir homologacao, conforme pedido de publicar tudo em uma rodada. Foi criado o bloqueio local output/ota-preview-review-required.flag, reconhecido pelo publicador. Pedido simples Abra meu contrato agora segue consulta autenticada/documento da UC; pedido explicito para a tela permanece navegacao. 46 testes de ferramentas/voz e 13 de navegacao passaram, TypeScript e seis hashes protegidos aprovados. Ainda falta validar esse encaminhamento no Preview oficial e os itens pendentes da matriz acima; nao tratar ponta a ponta como concluido.

Ajuste visual solicitado: a lista de UCs agora reutiliza PlantWeatherCover integralmente, com consulta autenticada propria, icone, local/horario, detalhe de fonte, fundos por condicao e chuva compartilhada. Foto personalizada preservada. Removido overlay antigo duplicado. A validade do clima e reavaliada por minuto nos dois ambientes. Conferencia visual no Preview ainda pendente.

Preview oficial 01a1df4b-128e-721a-8411-7456d782349a carregado no S23. Card da UC Casa conferido com componente integral do Gerador: icone de nuvem, Parcialmente nublado 23 graus, Itajuba/MG e horario, fundo nublado coerente e nenhuma chuva. Botao de informacao abriu detalhe regional com referencia e fonte corretos. Sem sobreposicao do nome/status. Pedido digitado Abra meu contrato abriu diretamente o PDF no Adobe. Ao voltar, a conversa preservou o documento vinculado a UC 1204584501840; pergunta Qual o consumo medio dessa UC retornou 271 kWh e distinguiu media cadastrada do consumo da ultima fatura. Isto valida o caminho por texto e retorno do PDF; nao substitui a repeticao por voz apos encerramento por silencio. Producao continua bloqueada para o lote consolidado, conforme orientacao do usuario.

## Revisao consolidada adicional

Executados todos os testes TypeScript services/*assistant*.test.ts pelo transpiler TypeScript em CommonJS: 78 aprovados, zero falhas. Executados assistant-runtime.test.cjs, assistant-tools.integration.test.cjs e assistant-wake-word.test.cjs: 50 aprovados, zero falhas. Catalogo cobre os 28 modulos registrados para as duas variantes. Estes resultados nao substituem as linhas de aparelho pendentes. Solicitada ao usuario a repeticao real Solar, Abra meu contrato, retorno do PDF, encerramento por silencio e consumo medio dessa UC no Consumidor Preview. Aguardando resultado sem marcar conferencia como realizada. Lote continua sem promocao adicional de producao. Envio positivo de autoleitura depende de janela valida/medidor real; nao enviar leitura ficticia.
