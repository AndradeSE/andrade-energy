# Mapeamento da Solar

## Revisão de 14/11/2026

Nome e chamada por voz restaurados para **Solar**, conforme solicitado. A restauração usa a base `508f31e0`, mantendo os reparos anteriores de documentos e contexto. Não utiliza as aproximações de reconhecimento de Andrade.

A suíte `services/assistant-tools.integration.test.cjs` executa o detector, o despachante real, os seletores e o resolvedor de documentos para os 28 módulos do catálogo. Os serviços autenticados e o armazenamento nativo são simulados com dados de teste; nenhuma transação é enviada. São 34 cenários, incluindo:

- Consulta de consumo médio cadastrado e último consumo da fatura, com valores distintos.
- Documento da UC explícita, resolução do PDF e consulta posterior de consumo.
- Pedido de PDF sem repetir o número, restrito à UC do contexto.
- Nova UC explícita substituindo o cliente anterior, mantendo a usina autorizada.
- Encerramento e recarregamento do histórico antes de perguntar pelo consumo da mesma UC.
- Histórico isolado por usuário e usina; módulos administrativos bloqueados no Consumidor e sem permissão.

Três defeitos foram reproduzidos e corrigidos: o pedido de PDF sem UC explícita podia listar outras UCs; uma UC explícita diferente podia continuar filtrada pelo cliente anterior; a correção ortográfica da conversa por voz podia transformar “liste usinas” em consulta da usina atual. O despachante agora recebe o pedido original após a classificação.

Validação automatizada: 34 cenários de integração, 56 testes de serviços do assistente e quatro testes de runtime aprovados. Isso não substitui reconhecimento de voz real, interação com a interface nem respostas de serviços de produção.

Conferência no S23 em 14/11/2026, Gerador Preview revisão `e61318f4`: nome Solar exibido; pedido digitado “Abra a fatura da Cemig da UC final 1898” abriu o PDF no leitor interno; após fechar o documento, sair e reabrir a conversa, “Qual foi o consumo dessa UC?” retornou `UC 854652001898 · OUT/2026 · 5.880 kWh`. Essa conferência usa serviços autenticados de homologação. A ativação pela palavra Solar e o ciclo completo por voz ainda aguardam a fala real do usuário; não registrar essa etapa como concluída pelo teste digitado.

| Fluxo | App | Portal |
| --- | --- | --- |
| Início, notificações, perfil e configurações da Solar | Navegação | Navegação |
| Clientes, unidades e usinas | Navegação e busca | Navegação e seleção pelo identificador |
| Faturas, consumo e economia | Consulta autenticada; consumo por UC e competência | Consulta autenticada; consumo por UC e competência |
| Contratos | Navegação e abertura de documento conforme acesso | Consulta e navegação |
| Rateio | Abre a tela de rateio | Abre o rateio da usina selecionada |
| Faturamento manual e recebimento por e-mail | Abre os formulários conforme acesso | Abre os formulários conforme acesso |
| Cotas de serviços | Abre a tela administrativa | Abre a seção administrativa |
| Autoleitura e protocolos | Abre a autoleitura da UC elegível e o histórico diretamente | Abre Minha unidade para autoleitura da UC elegível |
| Solicitação de nova UC e anexos | Abre os anexos do cliente | Abre o formulário de solicitação |
| Equipe, plano, comercial e empresas | Navegação e consultas conforme perfil | Navegação e consultas conforme perfil |
| Alterações cadastrais | Campos suportados, com revisão | Campos suportados, com revisão |
| Pagamentos e assinatura | Fora das ações da Solar | Fora das ações da Solar |

O catálogo executável está em services/assistant-flow-catalog.ts, com os 28 módulos registrados. Ele é incluído no contexto textual e no guia entregue à voz Live. A compilação exige uma entrada para cada módulo. O teste de cobertura confere que o guia entregue inclui cada entrada.

Pedidos de dados passam pelas consultas autenticadas em assistant-tools.ts; navegação usa assistant-safe-navigation.ts; comandos de formulário usam assistant-controls.ts; alterações cadastrais suportadas usam revisão antes/depois; sequências usam assistant-sequence.ts. O pedido de documento tem precedência sobre a abertura genérica de uma lista. Cada execução preserva o acesso e a usina/UC selecionados.

Consumo médio é lido de consumo_medio_kwh nas UCs da usina, por cliente, número completo ou final. Valores ausentes não viram zero. Havendo várias UCs do mesmo cliente, cada média é identificada pela UC; homônimos exigem identificação. Último consumo vem da competência da fatura, não da média cadastrada. Perguntas de acompanhamento preservam o alvo na mesma conta, inclusive por voz.

Cotas, histórico de leituras e protocolos, unidades e indicadores da usina têm consultas explícitas. Economia de cliente no Gerador consulta seu dashboard sem exigir abrir o cadastro. Contratos e propostas respeitam o cliente/UC solicitado. Consultas não ativam automação nem geram protocolo; transações e assinaturas não são executadas pela Solar.

Validação desta revisão: 37 testes de consultas, navegação, contexto, sequências, catálogo entregue à voz e restrições de botões; TypeScript aprovado. Na web, consulta de consumo médio e contexto sincronizados, com 104 testes e build aprovados. Isso verifica as capacidades registradas; não significa que toda combinação de linguagem ou todos os dados reais de cada conta foram testados.


Validação no S23 em 13/11/2026: consulta autenticada de consumo e abertura da fatura Cemig no leitor interno; Compartilhar PDF abriu o seletor Android com o arquivo carregado; cancelamento do compartilhamento e fechamento do PDF preservaram a conversa. Nenhum destinatário foi selecionado. Tempo de tela restaurado a 30 segundos. Ajuste publicado nos canais atuais production-gerador (runtime 1.0.15) e production-consumidor (runtime 1.0.14).
