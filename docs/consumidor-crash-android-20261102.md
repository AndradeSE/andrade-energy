# Recuperação Consumidor Android — 02/11/2026

S23 conectado por ADB. Produção versionCode 9; Preview versionCode 2.
Ambos registraram `IndexOutOfBoundsException: getChildDrawingOrder() returned invalid index 2 (child count is 2)`, com ReactViewGroup e ScreenStack.

O relato upstream https://github.com/software-mansion/react-native-screens/issues/4513 descreve o mesmo erro com screens 4.16.0 / RN 0.81.5 e SwipeRefreshLayout durante transições. A correspondência é evidência para a mitigação, não confirmação isolada da causa.

Correções:
- a40d8419: clipping desativado nas rolagens compartilhadas; insuficiente para resolver a abertura.
- e8770fb4: seleção de unidade usa atualização explícita.
- 4a04111f: rolagens compartilhadas não montam RefreshControl/SwipeRefreshLayout no Android; botão Atualizar preserva a ação. iOS mantém controle nativo.
- cb61aa2f: mesmo tratamento na aba Contrato, que usa ScrollView diretamente.

TypeScript passou após todas as alterações. Não limpar dados ou desinstalar apps para testar.

Preview runtime 1.0.4-preview-live-awake publicado:
- grupo e69d73f9-4218-4792-ac8e-9bd1c0db6add
- update 01a19f33-0a84-7e74-8c96-a7b56abda843
- S23 confirmou DownloadComplete, 56 arquivos, 0 falhas, isUpdatePending=true às 23:18:21.
- Solicitada reabertura manual para aplicar e testar navegação. Ainda não declarar resolvido.

A primeira publicação de produção (grupo 3fd856f2-450f-4fb9-ac93-39bc75c64e6b, runtime 1.0.10-production-arm32) contém apenas a mitigação anterior. A publicação seguinte e8770fb4 foi interrompida antes de publicar. Falta publicar correção completa em produção após teste do Preview.

Tempo de tela do S23 temporariamente alterado de 30000 para 600000 ms durante conferência. Restaurar 30000 ao finalizar.

## Validação e publicações seguintes

- S23 aplicou Preview 6abda843; navegação por Home/Faturas/Contrato/Economia/Perfil não registrou novo crash. Último crash Preview permaneceu às 23:16:25, anterior à aplicação.
- Produção universal publicou grupo 83578102-4e82-4aea-b5d8-146ade4895e0, update 01a19f3b-d858-7fcd-9d20-d6282543debb. S23 confirmou download e usuário reabriu; Home e Contrato vistos por screenshot, Solar visível e abriu ao toque, processo 604 preservado.
- Produção runtime antigo publicou grupo 039868f9-5eab-4385-9ef8-fede8c38b92c, update 01a19f38-ee94-7354-ae9b-20a5e945b6a5.
- e963226b remove bloqueio global da Solar por carregadores de abas preservadas. Universal produção contém essa alteração; runtime antigo ainda precisa recebê-la.
- Usuário rejeitou botão Atualizar e pediu manter carregamento inicial na logo.
- 57ad3836 implementa gesto observado por eventos de toque/rolagem sem SwipeRefreshLayout; indicador Puxe/Solte/ActivityIndicator. Root mantém logo animada e espera warmup inicial até 30s (navegação posterior mantém orçamento de 8s).
- Preview dessa última alteração: grupo 1b932b4c-25df-4167-9b21-4f839f13aaf8, update 01a19f43-1746-7d34-ad33-89a3e0938a15.
- Solicitada reabertura para testar gesto e logo antes de publicar essa última alteração em produção. Não declarar último ajuste validado antes de conferir a revisão aplicada.

## Mudança para correção nativa (03/11)

Usuário rejeitou o gesto recriado, mesmo depois de funcionar com indicador circular. Exige o RefreshControl original. Portanto, não publicar a alternativa como conclusão.

Commit 48aa0553 implementa:
- plugin `with-refresh-transition-fix.js`: backport exato do append do filler do upstream PR #4519 (Screen.kt), idempotente e falha se o trecho esperado mudar;
- builds com `ANDRADE_NATIVE_REFRESH_FIXED=1`, versionCode Preview 3 / produção 10, runtime `1.0.11-{preview|production}-refresh-fixed`;
- RefreshControl original só é reativado no runtime nativo corrigido; antigos continuam protegidos pela alternativa até reinstalar;
- lista de UC/usinas aquecida no cache durante splash e consumida pela seleção, sem nova tela cheia a cada foco;
- limpeza da UC antes de liberar a entrada; remove redirect assíncrono atrasado da Home;
- overlay de entrada segura a logo até o destino inicial da biometria, sem desmontar o Stack depois da entrada;
- perfis EAS `refresh-fixed-production-consumidor` e `refresh-fixed-production-gerador`, derivados dos universais; Preview segue local.

Primeira compilação local falhou em `:react-native-screens:compileReleaseKotlin` com overload duplicado `View.asScreen`; fonte contém uma única definição. Retry executa `:react-native-screens:clean :app:assembleRelease -Pkotlin.incremental=false`, log `C:/Users/vini_/andrade-energy/tmp/consumer-refresh-native-retry.log`, sessão exec 86041. Ainda em andamento às 00:13 em PC de 8 GB com pouca RAM livre. Não instalar o APK antigo de output como se fosse o novo.

Assinatura do Consumidor Preview instalado: SHA256 d32a187bf37425ca30be4f1faa2f6a8851115ea43d6aa8952151ea90751f883e. Cópia para comparação em `tmp/consumer-preview-installed.apk`. Confirmar assinatura, versionCode 3 e runtime novo antes de instalar. Produção nova somente pelo EAS após homologar. A última tentativa de publicar os ajustes finais foi cancelada antes de publicar; produção continua na recuperação anterior com botão/custom fallback.

## Conclusão da publicação nativa — 03/11/2026

- Preview Consumidor e Gerador compilados localmente, assinados com as chaves compatíveis e instalados no S23 sem apagar dados (versionCode 3).
- Consumidor: abertura logo → lista estável, gesto nativo original confirmado por captura, 18 trocas de abas com o mesmo processo e nenhum crash novo. Home preservada durante mais de dez minutos.
- Gerador: abertura até lista de usinas e Home conferida no S23; Solar visível. Instalação aguardava diálogo do Play Protect, encerrado sem habilitar envio permanente de apps.
- Produção compilada somente pelo EAS, versionCode 10, runtime `1.0.11-production-refresh-fixed`, armeabi-v7a e arm64-v8a, assinaturas anteriores preservadas.
- EAS Consumidor: `ff8677cd-fa61-4c74-92aa-4f8747b7392c`; SHA256 `687A686833255F33BB6FAE564551E3192127A94B58D0BF934AA2B897EB168470`.
- EAS Gerador: `92704abb-757c-4af4-95f6-ead6e0b67a51`; SHA256 `3AF2BCC06489F13B14D1569069278B7FDD0A8051E91DFE44CBBE4D974A9F5856`.
- Quatro assets estáveis atualizados no release `apps-2026-08-27`. Download completo dos dois links públicos de produção conferido por SHA256, ambos iguais aos APKs novos.
- Preview Consumidor SHA256 `4DD3692A293CC2DB1427C67A67AE2BCCA1F20E770890C78CF2AE47AC8FC2EE55`; Gerador `392145DE6ABA8B309DCFA31B19B4E0C49A5F0CC566E7E9AA5DA59B9120908B77`.
- O patch nativo exige instalar o APK novo; OTA em runtime antigo não recebe a alteração Kotlin. Não declarar o APK antigo corrigido nativamente.
- Tela mantida ativa por uma hora conforme pedido mais recente do usuário. Nenhum protocolo Cemig, pagamento ou transferência executado nesta conferência.
