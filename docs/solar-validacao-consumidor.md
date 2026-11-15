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
