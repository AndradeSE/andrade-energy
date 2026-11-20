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

## Resposta recebida em 19/11/2026

Assunto: `[Action Needed] OAuth Verification Request Acknowledgement`. Leitura autenticada pelo Gmail no navegador em 20/11; plugin solicitou reautenticação.

- Google considerou insuficiente a justificativa de gmail.readonly. Vincular explicitamente busca automática, leitura de anexos, identificação da UC e relatórios/faturamento que o usuário vê; metadata não fornece anexos, current-message exige interação em add-on e não substitui importação em segundo plano.
- Google apontou divergência de escopos. Console observado em 18/11 mostrava somente gmail.readonly, enquanto o código solicita também openid/email/profile. Conferir valores canônicos no seletor Google antes de salvar, sem aumentar permissões Gmail.
- Exigiu novo vídeo com todas as permissões expandidas e funcionalidades demonstradas, além de credenciais dedicadas e navegação clara. Não reenviar o vídeo anterior como se atendesse à nova exigência.
- Conta dedicada criada somente na homologação: `oauth-review@andradeenergy.com.br`, perfil GESTOR, empresa fictícia `0961ba06-0cd5-48e8-b898-fbab8b89c14b`, usina `a7fa6610-d444-4fcb-a4da-8d1e7cdfeadb`, UC fictícia 99999111819. Nenhum vínculo com a empresa de produção. Senha aleatória não é registrada no repositório; não foi enviada ao Google. Login da API e do proxy web passaram; iniciar OAuth pelo proxy ainda requer teste com cookies da sessão web.
- Aviso separado recebido em 20/11 informa expiração do acesso Andrade Energy à conta andradeenergyltda@gmail.com em 24/11/2026. O aviso não explica a causa nem representa aprovação/reprovação OAuth. Renovação precisa ser conferida na Conta Google, sem presumir que alterar status do projeto renove concessões antigas.
- Usuário autorizou participar da nova gravação/autorização com Gmail de teste. Em 20/11 o controle do Chrome foi desconectado e a janela ficou minimizada antes do alinhamento; nenhuma alteração de escopo foi salva nessa retomada.

## Alinhamento salvo em 20/11/2026

Após o usuário restaurar o navegador, o Console da conta andradeenergyltda@gmail.com confirmou “As mudanças de acesso aos dados foram salvas”. Selecionados gmail.readonly, openid, userinfo.email e userinfo.profile (identidade canônica correspondente aos aliases email/profile do código). Não foram incluídas permissões de envio, alteração ou exclusão de Gmail. A solicitação em análise foi atualizada pelo próprio Console.

Justificativa salva (989/1000 caracteres):

> Users enable automatic electricity-bill import to see original bills, monthly consumption/generation, credit balances and billing reports per authorized unit. While they are offline, our server searches recent CEMIG messages, reads matching MIME content and PDF/image attachments, identifies the unit and period, and stores the bill and extracted data in their company workspace. Users can open the imported bill and see processing results; plant bills update plant production, while eligible consumer bills feed configured billing. gmail.readonly is required for message search, content and attachment download. gmail.metadata cannot read bodies/attachments; current-message add-on scopes require an interactive add-on and cannot perform this unattended import. We do not send, modify or delete Gmail messages. openid/email/profile identify and display the connected account. Data access is read-only; Gmail search filters are application controls, not a restriction of the granted scope.

O link de vídeo anterior permanece cadastrado; ainda não há nova gravação revisada nem envio final declarando atendimento integral. Após confirmar o salvamento, a ferramenta de controle do navegador foi removida da sessão. Próxima etapa: gravar o fluxo real com conta de teste, permissões expandidas e legíveis, importação e abertura do PDF fictício; fornecer acesso do avaliador por canal autorizado e validar cookies do proxy no login web. Não confundir configuração salva com aprovação Google.
