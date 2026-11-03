# Aviso de atualização nativa

O app consulta, depois da entrada/biometria, o manifesto público do próprio pacote Android. Só avisa quando `Application.nativeBuildVersion` (versionCode instalado) é menor que `build`. OTA, runtime e revisão não entram nessa comparação. Offline ou consulta inválida não bloqueiam o uso.

O aviso oferece **Atualizar aplicativo** e **Depois**. O primeiro baixa o APK no cache privado, mostra o progresso, confere tamanho e MD5 contra o manifesto e abre diretamente o instalador Android por content URI com permissão de leitura temporária. Não usa navegador, lista de downloads nem compartilhamento. O Android valida a assinatura e exige a confirmação da instalação; se necessário, pede autorização da fonte. O download pode ser cancelado. O aviso reaparece em nova abertura enquanto a build não for instalada e deixa de aparecer após a instalação. Não modifica a política de bloqueio nem desinstala o app.

`scripts/publish-apk-release.ps1` chama `publish-native-apk-notice.ps1` após publicar o APK. O script lê pacote e versionCode diretamente do APK com aapt, confirma o SHA256 do asset estável e só então publica `<applicationId>.json` no release `apps-2026-08-27`. Falha na validação preserva o aviso anterior. Os manifestos nunca contêm credenciais.

As quatro combinações Gerador/Consumidor e Preview/produção têm manifestos separados. A URL recebida é validada contra o asset exato do pacote. Os APKs atuais anunciados são produção 10 e Preview 3. Para futuras builds, basta usar o publicador habitual; não editar o número manualmente nem criar um aviso por OTA.

O verificador chega aos APKs instalados por OTA compatível. Aparelhos que não recebem nenhum runtime mantido precisarão instalar uma build nova uma primeira vez.

Validação: TypeScript, quatro testes de comparação/isolamento (36 verificações) e cinco testes do fluxo de download/intent (arquivo válido, cache, corrupção, HTTP e cancelamento). Consulta HTTP dos quatro manifestos públicos confirmada. Os links www de ambos os apps retornaram APKs do GitHub, sem HTML ou Murajoias. O relato de Murajoias não foi reproduzido no computador; não atribuir uma causa sem evidência do link/tela no aparelho.

## Publicações confirmadas em 03/11/2026

- Preview Gerador runtime 1.0.11: `a8447c47-45f6-40e4-9561-1ec813810e73`.
- Produção Gerador runtimes 1.0.4 / 1.0.10 / 1.0.9 / 1.0.11: `c6826e15-967f-48a5-bfc2-b7b778cc05c0`, `291d4e3c-ddb6-4849-8a44-0946bbd59156`, `8d505a33-66f3-4edc-928e-0a8ab1255e22`, `cc988604-ec1a-4e0c-a31d-f6d568018486`.
- Produção Consumidor runtimes 1.0.4 / 1.0.10 / 1.0.11: `8635e4af-40e4-46a9-9b24-df8662a7af49`, `9349b9d3-4f93-4590-8cb5-a71f9a6ae439`, `dba1cf02-64a2-4d73-a466-5ba7a20d2ddf`.
- Nenhuma nova build necessária para distribuir o verificador. Instalações precisam carregar a OTA compatível; a confirmação da instalação do próximo APK continua sendo feita pelo titular no Android.
