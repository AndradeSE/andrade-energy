# Limpeza local — 09/10/2026

Foram retirados da pasta principal 298 itens temporários sem arquivos rastreados pelo Git e sem referência encontrada no código/configuração/scripts examinados. São capturas de tela, dumps de interface, mídias de teste e exportações de verificação. Mais 8 diretórios antigos de exportação foram retirados da pasta de trabalho usada nesta publicação.

Volume: aproximadamente 1.25 GiB. Os itens foram movidos para `C:/Users/vini_/andrade-energy-arquivos-temporarios-20261009`, fora do projeto, para permitir recuperação. O manifesto da pasta principal está em `arquivos-removidos-da-pasta.txt`; as exportações ficam em `worktree/`.

Não foram removidos código rastreado, testes automatizados, migrações, documentação, credenciais, assets usados pelo app, SDK Android, dependências instaladas ou worktrees Git. A pasta principal possui mudanças antigas não publicadas; elas foram preservadas. Arquivos cuja utilização não pôde ser descartada também foram preservados.

O `.gitignore` da versão atual passa a excluir capturas temporárias e exportações locais para evitar incluí-las acidentalmente em commits. Esta limpeza local não muda o cálculo de faturamento nem dados dos clientes.
