# Verificação Google OAuth — 17/11/2026

Projeto Google Cloud: project-09a73514-b45b-45d3-8e0 (My First Project), conta andradeenergyltda@gmail.com. Cliente web visível: Andrade Energy Gmail, 231630531431-pe6jlgectunpak42c8tkias0ohinvrua.apps.googleusercontent.com. O nome do cliente foi conferido; não foi comparado ao segredo/ambiente efetivo do Render nesta etapa.

## Concluído
- Corrigidos e salvos os três links da marca com https://www.andradeenergy.com.br, /privacidade e /termos. Apex sem www não tinha endereço DNS válido; www e páginas legais foram abertos no navegador.
- Adicionado somente TXT no apex andradeenergy.com.br no Registro.br, após aprovação explícita do usuário. Registros existentes www, _cf-custom-hostname.www e _openai-site-verification.www preservados.
- TXT: google-site-verification=zpkmG-1HfEdJyUcomzQ3wx4HNnQV4lsqeiEoXMFihyQ
- Servidor autoritativo a.sec.dns.br confirmou o TXT, TTL 3600. Google Search Console confirmou Propriedade verificada pelo provedor de domínio. Manter o TXT para preservar a verificação.
- Nova análise da marca foi aprovada. Publicar branding foi concluído; a página confirmou: Sua marca foi verificada e está aparecendo para os usuários.
- Nenhum pagamento foi feito. Escopos e credenciais existentes preservados.

## Pendente — verificação de acesso Gmail
A Central liberou Prepare for verification. O escopo gmail.readonly está classificado como restrito. O Google exige finalidade, justificativa e vídeo do YouTube. No formulário foram preenchidos Relatórios e monitoramento por e-mail e a justificativa abaixo. Save continua desabilitado sem vídeo; esses campos estão apenas no formulário aberto, não se presume gravação no servidor. Não enviada solicitação final.

Justificativa preparada:
Andrade Energy imports electricity bills for energy-management reporting after the account holder explicitly connects Gmail. The server periodically searches recent CEMIG billing messages, checks the sender, reads PDF attachments, and extracts the consumer-unit number, billing period, consumption, generation and credit balances. The imported PDF and structured billing data are stored in the authenticated platform and linked to the authorized company and consumer unit for billing and energy reports. gmail.readonly is needed to retrieve message contents and PDF attachments while the user is offline; identity-only and metadata scopes cannot provide the bill contents. The integration requests read-only access, rather than permission to modify messages or send email.

## Roteiro do vídeo exigido
1. Usar uma conta de teste autorizada e uma fatura de demonstração, preservando dados de terceiros.
2. Mostrar o nome Andrade Energy, a URL do portal e a tela de recebimento automático da unidade.
3. Acionar Conectar Gmail e mostrar o fluxo OAuth completo, o cliente/app e a permissão de leitura solicitada. Não gravar senha, códigos, tokens, cookies ou segredos.
4. Mostrar o usuário autorizando voluntariamente o acesso.
5. Mostrar uma mensagem de fatura CEMIG de demonstração e o PDF importado na plataforma, os dados extraídos e a vinculação à unidade correta.
6. Explicar que o backend consulta a caixa periodicamente e armazena a fatura/dados para gestão de energia. Mostrar onde desconectar a integração.
7. Publicar demonstração no YouTube com visibilidade adequada ao revisor, inserir o link real e revisar todas as declarações da etapa final antes de enviar. Não usar um link fictício nem declarar avaliação de segurança que não foi realizada.

Evidências locais: C:/Users/vini_/AppData/Local/Temp/google-propriedade-verificada-20261117.jpg; google-marca-publicada-20261117.jpg; google-gmail-video-pendente-20261117.jpg.
