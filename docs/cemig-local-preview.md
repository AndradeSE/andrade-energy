# Rateio Cemig no PC — Preview

O assistente local abre um Chrome de teste e um painel no endereço 127.0.0.1. O usuário entra diretamente na Cemig. A automação usa a mesma sessão para selecionar a UC geradora, confirmar Autoconsumo remoto, anexar o CSV e chegar à revisão. Nunca clica em Solicitar cadastro nem aceita a declaração final.

## Iniciar

Com Node, Chrome e as dependências do backend instaladas, na pasta backend:

```powershell
npm run cemig:local -- --csv "C:\caminho\cemig-rateio-2026-10-1121361801894.csv" --uc 1121361801894
```

O CSV deve ser o arquivo no padrão Cemig exportado pelo Preview, com percentuais conferidos e âncora definida. Não aceita o rascunho com cabeçalhos. A UC pode ser deduzida do final do nome exportado; use --uc para informar explicitamente a geradora.

Para validar o arquivo sem abrir navegador:

```powershell
npm run cemig:local -- --csv "C:\caminho\cemig-rateio-2026-10-1121361801894.csv" --uc 1121361801894 --check
```

## Uso

1. Entre no portal oficial na janela de teste, resolvendo eventual verificação pessoalmente.
2. Ao detectar a entrada no portal, o robô começa uma única execução automaticamente. Se não detectar, volte ao painel e toque em Continuar após o login.
3. O robô abre Compensação de Geração Distribuída, seleciona a UC exata, confere a modalidade e anexa o arquivo. A revisão permanece aberta para conferência.
4. Feche toda a janela Chrome de teste para encerrar a sessão e o painel.

Uma execução é permitida por vez. Falha depois do início do fluxo exige inspeção antes de novo teste; não há repetição automática de upload nem protocolo. Se a Cemig exigir uma ação antes do anexo, o painel preserva a sessão e explica como continuar.

O processo é local: não importa credenciais do backend, não salva senha em arquivo, não exporta cookies e não altera o perfil pessoal do Chrome. O painel aceita comandos somente de sua própria origem com token de sessão e escuta apenas em loopback. Não o exponha por túnel ou rede.

## Login assistido opcional

Em “Preencher acesso automaticamente”, informe usuário e senha diretamente no painel local. Para usar CapMonster, informe também a chave e mantenha marcada a opção que informa o processamento do desafio. Ao tocar em “Preencher e continuar”, os campos são limpos do painel após a entrega ao processo local. Os dados ficam em memória somente durante a tentativa; não são escritos em logs nem arquivos. A chave é usada apenas na API oficial do CapMonster. Usuário e senha vão apenas ao domínio oficial da Cemig.

Sem chave, o robô preenche o acesso e aguarda o CAPTCHA e o botão Entrar manuais. Com chave e opção habilitada, faz uma única resolução e envia o login imediatamente. Erros preservam a aba para conclusão manual; não há nova tarefa automática. A versão piloto continua limitada ao bônus de até US$ 0,10 e não compra saldo. Verificação Cloudflare continua manual.

Esta implementação usa um arquivo exportado pelo app. Não é ainda um botão publicado nos apps nem integração automática com o backend. A validação do portal real depende do login manual no Chrome de teste e do teste completo até a revisão. Não habilitado para protocolo em produção.
