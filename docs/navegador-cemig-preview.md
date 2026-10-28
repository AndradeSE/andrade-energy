# Navegador Cemig integrado — protótipo Android

Ativação de compilação: `ANDRADE_NATIVE_CEMIG_BROWSER=1`, `EXPO_PUBLIC_APP_ENV=preview` e variante `gerador`. A configuração de produção ignora essa flag. Runtime da continuação guiada: `1.0.7-preview-cemig-flow`; exige novo APK.

O teste aparece em Operação → Rateio → Testes e simulações apenas nesse novo APK, Android 8 ou superior. A Activity usa WebView do próprio Android e compartilha a sessão com um serviço em primeiro plano, com notificação e prazo de 10 minutos. Sair da tela mantém a sessão durante esse prazo; Encerrar ou remover o app dos recentes encerra o serviço. Não há reinício automático no boot ou após encerramento pelo sistema.

O protótipo abre somente HTTPS em domínios Cemig. Não altera User-Agent, não desativa verificação TLS, não lê arquivos locais, não expõe interface JavaScript nativa e não transmite credenciais ao backend. Recursos CSS/JS mantêm o carregamento normal do navegador. Geolocalização, câmera e microfone são recusados. Login e desafios de segurança são manuais nesta etapa.

O app lê a âncora salva e prepara o CSV por `/rateio-simulacao`, sem e-mail, push ou gravação de rateio. O arquivo segue para a Activity privada, com usina e competência. O serviço vincula sua identidade SHA256 à sessão; outro arquivo exige encerrar antes. No campo de anexo do serviço `compensation-gd`, oferece apenas esse CSV mediante confirmação. FileProvider privado limita acesso ao diretório de cache dedicado. O arquivo é removido ao encerrar o serviço.

Após o login, “Continuar rateio até a revisão” inicia a navegação na mesma sessão. O serviço acompanha a etapa e abre o serviço oficial; reconhece cadastro, UC exata em select nativo ou cartão identificado por número e Autoconsumo remoto em select/combobox. Controles ambíguos ou customizados desconhecidos pausam para conferência, sem escolher a primeira opção. Abre a aba Inserir por anexo. No anexo, oferece somente o arquivo vinculado à sessão; após confirmação e presença do nome no portal, avança para a revisão. A tela mostra o estado atualizado, inclusive retorno após minimizar.

Ainda não implementa preenchimento pelo cofre, resolução de CAPTCHA, todos os controles customizados do portal ou protocolo definitivo. Manter isso explícito na tela. A simulação intercepta clique em Solicitar cadastro e submit equivalente. Não afirmar que um protocolo foi criado. Uma sessão persistida não equivale a envio automatizado e continua sujeita às restrições e ao encerramento de processos pelo Android.

Verificação necessária: compilar APK, abrir no emulador, conferir layout/teclado, notificação, retorno da mesma sessão, botão Encerrar e expiração. Não protocolar durante os testes.

Referências utilizadas: Expo SDK54 `sdk/webview.mdx` e `sdk/background-task.mdx` na branch oficial `expo/expo/sdk-54`. O segundo documenta tarefas adiadas; não fornece execução de navegador ou garantia de horário.
