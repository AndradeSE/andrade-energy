# Publicação Android local

Os apps compartilham o código, mas não pacote, canal ou configuração incorporada.

1. Definir `EXPO_PUBLIC_APP_VARIANT` (`gerador` ou `consumidor`),
   `EXPO_PUBLIC_API_URL` e `NODE_ENV=production`.
2. Preservar a chave já usada; ao trocar de variante, executar
   `npx.cmd expo prebuild --platform android --clean --no-install`.
   O `--clean` é obrigatório: ele recria o manifesto nativo sem carregar o
   scheme do outro aplicativo.
3. Conferir que a versão regenerada usa somente o pacote e o scheme corretos
   para a variante antes de compilar.
4. Compilar usando o init script que declara variante e API como entradas do cache:

   ```powershell
   .\android\gradlew.bat -p android -I ../scripts/android-variant-inputs.gradle :app:assembleRelease '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --max-workers=2 --no-parallel --no-daemon
   ```

5. Exigir `BUILD SUCCESSFUL`. Conferir pacote e arquiteturas com `aapt`, assinatura
   com `apksigner`, configuração Expo, canal, bundle atualizado e SHA256.
6. Copiar APK validado para caminho versionado antes de mudar de variante.
7. `publish-apk-release.ps1` exige variante, arquivo e SHA256 esperado. Faz upload
   temporário, exige digest e tamanho corretos, preserva asset anterior como backup
   e troca o nome estável. Não publica source code nem credenciais.
8. Conferir download pelo domínio público. Instalação no aparelho e OTA são etapas
   distintas e não devem ser declaradas concluídas apenas pelo upload do APK.

Nunca adicionar APKs, chaves ou caches gerados ao commit. Os instaladores existentes
usam uma chave de debug; preservar compatibilidade agora não substitui um plano de
assinatura de produção para distribuição futura.
