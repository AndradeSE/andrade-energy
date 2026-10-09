# Auditoria Android por Wi-Fi — 09/10/2026

Ambiente: Gerador Preview e Consumidor Preview em Samsung SM-S911B. As correções desta auditoria foram publicadas apenas em homologação.

## Correções

- Painel do consumidor selecionava SET/2026 antes de OUT/2026 pela ordem alfabética. Agora usa ano e mês reais. Confirmado no celular: UC 854652001898 passou de 0% para 100%, com consumo e energia compensada de 5.880 kWh.
- Resumo operacional normaliza SET/2026, 09/2026 e 2026-09 para a mesma competência. Confirmado no celular: setembro passou de zero para 16.040 kWh gerados, 15.804 kWh alocados, 236 kWh disponíveis e 98,5% de ocupação, coincidindo com o início do Gerador.
- Conclusão duplicada de OAuth mantém o resultado e a UC associada; chamadas simultâneas compartilham a requisição. Erros e estados pendentes permitem nova tentativa.
- Campos de senha/OTP financeiro, chave Pix e valor têm cor explícita de placeholder. Senha legível confirmada no celular após OTA.
- Ordem das abas internas do Gerador alinhada à navegação principal: Financeiro antes de Contrato.

Não houve alteração no motor de cálculo das faturas, emissão de cobrança, envio de e-mail ou alteração das faturas existentes nesta auditoria.

## Cobertura observada

Gerador: início, usina, recebimento automático, clientes, detalhes do cliente, contratos, financeiro, formulário de colaboradores, operação, menu de faturamento e abertura de formulário manual.

Consumidor: início, lista de faturas, abertura do PDF, contrato, perfil, notificações e troca entre duas UCs. A troca de UC apresentou os dados correspondentes à unidade escolhida. Login realizado pelo usuário durante a verificação.

## Validação automatizada

- Backend publicado: compilação TypeScript e 70 testes aprovados, incluindo injeção, compensação, saldo anterior e normalização de competências. Variáveis fictícias de Supabase usadas somente para inicializar os testes locais sem acesso ao banco.
- Aplicativo: TypeScript aprovado; 4 testes de conclusão OAuth e 20 testes do assistente aprovados.

## Limites da auditoria

Não foram executados pagamentos/Pix, emissão de novas faturas, aceite de contratos, envio de convites, envio de e-mails nem novo consentimento OAuth. Entrega real de push e encaminhamento Gmail/Hotmail permanecem sem validação ponta a ponta nesta rodada. Não há garantia de ausência de falhas em fluxos não executados.

Publicações: aplicativo 523b347; backend c1d47cc e 818236c, branch codex/preview-voice-backend.

Evidência local do indicador: C:/Users/vini_/.codex/andrade-audit-injecao-corrigida.png.
