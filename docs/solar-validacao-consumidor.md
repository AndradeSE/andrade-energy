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
