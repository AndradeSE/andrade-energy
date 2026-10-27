# Navegador Cemig integrado — protótipo Android

Ativação de compilação: `ANDRADE_NATIVE_CEMIG_BROWSER=1`, `EXPO_PUBLIC_APP_ENV=preview` e variante `gerador`. A configuração de produção ignora essa flag. Runtime isolado: `1.0.5-preview-cemig-browser`.

O teste aparece em Operação → Rateio → Testes e simulações apenas nesse novo APK, Android 8 ou superior. A Activity usa WebView do próprio Android e compartilha a sessão com um serviço em primeiro plano, com notificação e prazo de 10 minutos. Sair da tela mantém a sessão durante esse prazo; Encerrar ou remover o app dos recentes encerra o serviço. Não há reinício automático no boot ou após encerramento pelo sistema.

O protótipo abre somente HTTPS em domínios Cemig. Não altera User-Agent, não desativa verificação TLS, não lê arquivos locais, não expõe interface JavaScript nativa e não transmite credenciais ao backend. Recursos CSS/JS mantêm o carregamento normal do navegador. Geolocalização, câmera e microfone são recusados. Login e desafios de segurança são manuais nesta etapa.

Ainda não implementa preenchimento pelo cofre, seleção da usina, anexo de CSV, autorização ou protocolo. Manter isso explícito na tela. Uma sessão persistida não equivale a envio automatizado e continua sujeita às restrições e ao encerramento de processos pelo Android.

Verificação necessária: compilar APK, abrir no emulador, conferir layout/teclado, notificação, retorno da mesma sessão, botão Encerrar e expiração. Não protocolar durante os testes.

Referências utilizadas: Expo SDK54 `sdk/webview.mdx` e `sdk/background-task.mdx` na branch oficial `expo/expo/sdk-54`. O segundo documenta tarefas adiadas; não fornece execução de navegador ou garantia de horário.
