# Cofre Cemig — piloto Preview

O acesso é cadastrado pelo titular na tela protegida do app. Não coletar senha em
chat, logs, arquivos de teste ou variáveis públicas do Expo. O endpoint GET retorna
somente configuração e data, nunca usuário, senha ou conteúdo cifrado.

Limites: apenas banco Preview autorizado, gestor e superadministrador Andrade,
usina pertencente à empresa da sessão. O cofre é separado por `(empresa_id,
usuario_id)`, sem compartilhar automaticamente entre colaboradores. A UI permite
substituição e exclusão; não oferece leitura da senha salva.

Proteção: AES-256-GCM, IV aleatório de 12 bytes, chave derivada com finalidade
exclusiva `cemig-credential-v1`, AAD vinculada à empresa e ao usuário. Chave de base
privada já utilizada para dados financeiros/OAuth. Falta de chave bloqueia gravação.
Tabela com RLS e sem acesso anon/authenticated. Somente backend service_role.

No piloto o comando **Entrar com acesso salvo** exige autorização explícita por
sessão e resposta do CAPTCHA aplicada. Um CAS reserva uma tentativa de login.
O worker lê a credencial e preenche somente o login oficial da Cemig, exige campos
inequívocos e resposta reCAPTCHA presente, verifica cancelamento antes de cada
preenchimento e antes do envio. Erros não reproduzem mensagens do navegador ou
credenciais. Nenhuma repetição automática de senha ocorre.

O login enviado não significa autenticação. Depois do envio, a validação existente
tenta anexar o CSV e para na revisão, sem protocolo. Login recusado, MFA ou
Cloudflare exigem ação humana. O cofre não resolve verificações do portal.

O navegador em nuvem processa o acesso ao preencher a página; o app explica isso
antes da autorização. Solar e CapMonster não recebem a credencial. Não habilitar
esse piloto em produção sem teste real com o titular, conferência da retenção do
provedor e revisão das permissões de produção.

Estado de entrega: testes de cifra, vínculo entre contas, origem do formulário e
cancelamento são automatizados. A aceitação do login pelo portal exige validação
real. Até lá não declarar o login automático homologado.
