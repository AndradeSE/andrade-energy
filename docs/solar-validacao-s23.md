# Conferência autenticada da Solar no S23 — 14/11/2026

Gerador Preview, conta administrativa de homologação, usina selecionada explicitamente. Perguntas digitadas na interface, serviços reais de homologação, capturas conferidas. Nenhuma cobrança, assinatura, pagamento, convite ou protocolo foi enviado.

| Módulo | Consulta executada | Resultado observado |
| --- | --- | --- |
| perfil | Consulte meu perfil | Cadastro e botão de revisão; tela de Perfil aberta |
| clientes | Liste clientes | Três clientes com situação cadastral |
| usinas | Liste usinas | Reproduziu normalização incorreta para indicadores da usina atual; corrigida no chat para preservar o plural |
| unidades | Consumo médio da UC final 1898 | 5.880 kWh, identificado como média cadastrada |
| faturamento | Consulte faturas | Uma fatura, OUT/2026, paga; botão abriu Faturamento |
| contratos | Consulte contratos | Contratos com número e situação, incluindo vigentes e substituídos |
| economia | Economia da UC final 1898 | Desconto 40%, economia R$ 1.836,45, saldo 9.759 kWh, referência 2026-10 |
| carteira | Saldo disponível | Carteira ativa; disponível e pendente zero; recebido registrado |
| equipe | Liste colaboradores | Nenhum registro de equipe/convite neste acesso |
| atividade | Consulte auditoria | Nenhum registro de atividade neste acesso |
| operacao | Consulte rateio | Fechamento 2026-09, 16.040 kWh gerados, 7.153,2 kWh alocados, aberto |
| inversores | Liste inversores | Nenhum inversor registrado |
| recebimento | Recebimento da usina | Ativado, aguardando fatura; nenhuma conexão de e-mail registrada |
| assinatura | Meu plano atual | Nenhuma assinatura vinculada a este acesso; não inventou plano |
| termos | Consulte termos | Texto e versão dos documentos disponíveis |
| empresas | Liste empresas | Dois ambientes autorizados |
| comercial | Consulte comercial | Dois geradores, um ativo e quatro planos disponíveis |
| privacidade | Pedidos de privacidade | Nenhum pedido registrado |
| cotas | Cota do Render | Serviço sem leitura registrada; não inventou saldo |
| leituras | Histórico da UC final 1898 | Nenhuma leitura recebida; não afirmou protocolo |
| assistente-config | Configurações da Solar | Explicação e botão para preferências |
| tutoriais | Tutoriais | Informou que estão desativados |
| sobre | Últimas atualizações | Revisão instalada e nota correspondente |
| anexos | Consulte anexos | Escolha entre os três clientes autorizados |
| proposta | Proposta da UC final 1898 | Documento da UC correta oferecido, sem convite/aceite |
| pagamento | Consulte boleto | Opção de consultar pagamento de OUT/2026; nenhum pagamento executado |
| calculo | Memória de cálculo da UC final 1898 | Documento de OUT/2026 oferecido |
| conta-luz | Consumo da UC final 1898 | 5.880 kWh, OUT/2026, com UC completa |

A consulta de cada módulo foi exercitada na interface. Isso não significa executar toda operação de escrita ou validar o reconhecimento de cada frase por voz. Listas vazias e ausência de documento/plano são resultados reais da massa de homologação, não comprovação do caminho com dados presentes. Os 34 cenários de integração complementam esses casos com dados controlados.

O fluxo de abertura do PDF Cemig e retomada da UC entre conversas foi conferido separadamente na interface e confirmado pelo usuário por voz. Durante a ampliação desta conferência, um acesso direto durante a restauração da sessão revelou erro de hooks, corrigido movendo todos os hooks para antes do retorno condicional e condicionando a ativação por voz à autenticação. A abertura direta foi repetida sem o erro na revisão cf3dea08.
