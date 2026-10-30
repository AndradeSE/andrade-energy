# Melhorias dos apps adaptadas à web

Implementação no portal existente do repositório. O projeto de hospedagem original foi preservado: `appgprj_6a8c66b15ba48191baad8777fd2d1eba`, associado nos registros anteriores ao domínio www.andradeenergy.com.br.

## Alterações

- Configuração da UC permite escolher com ou sem fidelidade. Sem fidelidade sugere 30% para GD2 e 20% para GD1 quando o regime está identificado; o desconto permanece editável.
- Minuta consulta a configuração atual da UC antes de preparar o contrato, suporta prazo indeterminado e aviso prévio de 90 dias, sem exigir prazo em anos no plano sem fidelidade.
- Consumidor pode solicitar renovação para novo aceite, informar não renovação e pedir cancelamento.
- Gerador consulta o pedido, aceita o início do desligamento e confirma a conclusão na distribuidora com data, protocolo e confirmação explícita. Todas as ações usam as APIs autenticadas e suas validações existentes.
- Corrigida a consulta do contrato do gerador usando unidade_consumidora_id, em vez de interpretar o ID do contrato como ID da UC.
- Fatura apresenta cards de compensação, injeção e saldo atual. Valores ausentes são identificados como não informados. PDFs compartilham o backend já atualizado, sem duplicar o motor de cálculo.
- Limpar lista foi para o cabeçalho, ao lado de Fechar. Os avisos de contrato/fatura oferecem navegação; UCs da notificação são conferidas na lista autorizada do consumidor.
- Solar usa as regras atuais de planos, desligamento, renovação e lembrete de faturas; consultas de vencimento pessoal continuam na consulta autenticada, sem serem substituídas por regras genéricas.
- Tutoriais removidos do menu. Incluídas as adaptações anteriores de privacidade, conexão de e-mail, automação assistida da Solar e sessão web por cookie HttpOnly com proteção de origem no proxy.
- Dependências da web atualizadas sem atualização forçada: npm audit informa zero vulnerabilidades conhecidas.

## Verificação

71 testes da web passaram, incluindo proteção da sessão/proxy, contexto da Solar, confirmação de alterações, regras GD1/GD2 e distinção entre avisos de fatura e contrato. Compilação TypeScript/Vite/worker passou. Preview local respondeu HTTP 200.

A ferramenta do navegador falhou com erro de criação dos arquivos do kernel; não foi concluída uma inspeção visual desta versão. Não foram criados clientes, faturas ou cancelamentos reais em produção durante a adaptação.

## Publicação pendente

Sites get_site para o projeto original retornou NOT_FOUND. A conta conectada jpmuller.contabil@gmail.com lista apenas outro portal Andrade Energy (`appgprj_6a8dde88c4548191ac12362f730720a6`), sem domínio personalizado associado. Esse outro projeto não foi alterado. Foi solicitado acesso ao projeto que administra www.andradeenergy.com.br. A implementação está preparada, mas não está publicada no domínio.
