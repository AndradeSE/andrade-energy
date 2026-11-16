# Base de publicacao mobile

A fonte de release e a branch `codex/gerador-share-release-20261113`. Nao montar APKs novos diretamente dos checkouts antigos `autoleitura-app-production-20261105` ou `autoleitura-consumidor-20261105`: eles contem historicos e alteracoes divergentes.

Antes de compilar ou publicar Consumidor, executar `node scripts/check-consumer-release.cjs` com `EXPO_PUBLIC_APP_VARIANT=consumidor`. O verificador tambem roda no hook do EAS e no publicador OTA. Nao regenerar hashes automaticamente para fazer o bloqueio passar. Conferir diff com a interface aprovada, compilar TypeScript e homologar a mudanca primeiro. Depois atualizar apenas os hashes dos arquivos revisados.

Consumidor: perfil EAS `camera-production-consumidor`, canal `production-consumidor`, runtime `1.0.14-production-consumidor-camera`. Gerador: perfil `share-production-gerador`, canal `production-gerador`, runtime `1.0.15-production-gerador-share`. Os runtimes legados do Consumidor continuam recebendo OTA enquanto houver usuarios neles. Nao publicar uma variante no projeto da outra.

Cada APK novo deve conter as telas aprovadas embutidas; OTA nao deve ser usada para esconder uma base antiga no APK. Validar assinatura, packageId, versionCode crescente, ABIs e arquivo completo antes de trocar o link. Publicar o manifesto de aviso nativo somente depois de o asset estavel correto estar online. Conferir HTTP200, bytes e hash. Apagar somente instaladores antigos depois disso; nunca apagar canal legado em uso.

EAS build12 Consumidor iniciada no commit258cc5f1 com as telas restauradas. O guard de publicacao foi adicionado no commit1413977d enquanto essa build estava em andamento; ele passa a proteger as proximas builds. O arquivo exportado para a OTA foi comparado com todos os seis hashes e correspondeu a base.

Checkout permanente da fonte atual: C:/Users/vini_/andrade-energy/.worktrees/mobile-release-current. A pasta foi retirada de Temp para evitar perda durante limpeza de temporarios.


Release validada em 16/11/2026: Consumidor versionCode 13 / build 891c0aa5-e4b6-43dd-9247-e630bcffbbd5; Gerador versionCode 14 / build 58ea6cf2-b76a-4baf-86a3-0ebe4fe9a574. Fonte comum 3db9c4798c525ea764bbacd756cc6c58864feddd, nesta branch e checkout permanente. Assinaturas, pacotes e runtimes acima preservados. Ambos publicados, hashes dos downloads publicos conferidos antes dos avisos e instalacao via atualizador confirmada no S23. Evidencias e hashes em docs/solar-validacao-consumidor.md. Estas builds substituem os instaladores anteriores; nao retornar aos checkouts antigos.
