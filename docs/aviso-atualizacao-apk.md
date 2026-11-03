# Aviso de atualização nativa

O app consulta, depois da entrada/biometria, o manifesto público do próprio pacote Android. Só avisa quando `Application.nativeBuildVersion` (versionCode instalado) é menor que `build`. OTA, runtime e revisão não entram nessa comparação. Offline ou consulta inválida não bloqueiam o uso.

O aviso oferece **Atualizar aplicativo** e **Depois**. O primeiro abre o APK estável correspondente ao pacote; o Android confirma a instalação. O aviso reaparece em nova abertura enquanto a build não for instalada e deixa de aparecer após a instalação. Não modifica a política de bloqueio nem desinstala o app.

`scripts/publish-apk-release.ps1` chama `publish-native-apk-notice.ps1` após publicar o APK. O script lê pacote e versionCode diretamente do APK com aapt, confirma o SHA256 do asset estável e só então publica `<applicationId>.json` no release `apps-2026-08-27`. Falha na validação preserva o aviso anterior. Os manifestos nunca contêm credenciais.

As quatro combinações Gerador/Consumidor e Preview/produção têm manifestos separados. A URL recebida é validada contra o asset exato do pacote. Os APKs atuais anunciados são produção 10 e Preview 3. Para futuras builds, basta usar o publicador habitual; não editar o número manualmente nem criar um aviso por OTA.

O verificador chega aos APKs instalados por OTA compatível. Aparelhos que não recebem nenhum runtime mantido precisarão instalar uma build nova uma primeira vez.

Validação: TypeScript e quatro testes (28 verificações de comparação, isolamento, entradas inválidas e URL) aprovados. Consulta HTTP dos quatro manifestos públicos confirmada.
