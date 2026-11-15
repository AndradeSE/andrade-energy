# Solar — matriz própria do app do Cliente

A validação do Gerador não substitui a do Consumidor. Esta matriz separa testes controlados de conferência autenticada no aparelho. Não publicar uma conclusão geral de ponta a ponta para o Cliente sem fechar as etapas de aparelho abaixo.

| Jornada | Aceitação | Evidência atual |
| --- | --- | --- |
| Perfil | Consultar pelo ambiente CONSUMIDOR; edição com revisão e confirmação | Consulta automatizada; edição de perfil conferida no Gerador, falta repetir no Cliente |
| UC | Listar apenas próprias, trocar pelo fluxo do app e atualizar contexto | Apelido próprio tem teste de automação; troca real pendente no Cliente |
| Consumo | Distinguir média cadastrada de consumo da última competência | Integração automatizada com valores distintos |
| Economia | Consultar dashboard da UC própria selecionada; não assumir zero sem dados | Integração automatizada de alvo e ausência de UC autorizada |
| Contrato | PDF da UC selecionada, compartilhamento e retorno preservados | Resolução do PDF automatizada; toque/compartilhamento no Cliente pendentes |
| Faturas | Documento Andrade e Cemig conforme cobrança unificada; não exibir campos de pagamento no demonstrativo | Conferência específica da política de documentos pendente nesta rodada do Cliente |
| Autoleitura | UC elegível; câmera, galeria e PDF; extração, ilegibilidade, envio e histórico | Serviço próprio e ausência de leituras automatizados; sequência real pendente |
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
