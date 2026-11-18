# Verificação OAuth Gmail — 18/11/2026

Projeto: `project-09a73514-b45b-45d3-8e0`, número `231630531431`.
Conta: `andradeenergyltda@gmail.com`. Não confundir com Tagtools.

## Evidências conferidas

- `conexoesEmail.service.ts`: openid, email, profile e gmail.readonly; refresh token persistido com AES-256-GCM; exclusão tenta revogar token e remove conexão local.
- `gmailLeitura.client.ts`: busca por remetente Cemig, anexos e janela de datas; leitura MIME e download dos anexos. Filtro é da aplicação, não limitação do consentimento Google.
- `recebimentoFaturas.service.ts`: PDF interpretado em worker local, associado por UC e escopo autorizado; produção da usina separada de cobrança de consumidor.
- Demonstração fornecida pelo usuário: https://youtu.be/nZMV7zIpHGU. A consulta HTTP identificou o vídeo; não equivale a revisão audiovisual integral nem confirmação de todas as permissões visíveis.
- Política pública versão `1.3-gmail`, suplemento aplicado em homologação e produção, endpoints `/api/privacidade/politica` confirmaram Gmail, Limited Use e contato corrigido. Versões anteriores preservadas, aceites anteriores não reescritos.
- Resposta inicial enviada na conversa Gmail `1a1f0788320c9b2e`, mensagem `1a1f091c190cd82f`. Não foi declarada conformidade integral.

## Pendências — não declarar concluídas

1. Confirmar diretamente no Cloud Console a correspondência exata dos escopos submetidos com os quatro solicitados em execução e o estado atual da revisão.
2. Revisar o vídeo integral quanto à legibilidade de consentimento/permissões e funcionalidade demonstrada.
3. Preparar acesso dedicado do avaliador à homologação, com dados fictícios e sem acesso à empresa de produção; fornecer credenciais por canal apropriado, nunca senha de conta pessoal.
4. Conferir a conta/projeto e modalidade contratual de cada provedor de IA/voz antes de permitir dados Google ou derivados. Gemini gratuito admite uso de conteúdo para melhoria de modelos; termos pagos diferem. As rotas genéricas não demonstram, por si, que a conta do provedor possui proteção contratual adequada. A declaração pública de Uso Limitado não substitui esse controle.
5. Formalizar prazos por classe de dados, responsáveis e procedimento de atendimento/eliminação. O texto publicado explica o processo atual, sem inventar prazo automático ou rotina inexistente.
6. CASA: aguardar encaminhamento/nível pela equipe Google. Não há Letter of Validation emitida. Segundo a documentação Google, avaliação é a etapa final e a equipe informa quando iniciá-la. Não contratar nem assumir custos sem escopo/orçamento e autorização.

## Referências consultadas

- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/terms/api-services-user-data-policy
- https://support.google.com/cloud/answer/13465431
- https://aistudio.google.com/docs/terms

Esta revisão não é certificação CASA, aprovação OAuth ou declaração geral de conformidade legal.
