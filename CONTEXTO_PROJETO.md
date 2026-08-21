# Andrade Energy — contexto do projeto

## Visão geral

Plataforma de gestão de energia por assinatura, composta por dois aplicativos Expo SDK 54 e um backend Node/Express com Supabase:

- **Andrade Energy Gerador:** gestão de usinas, clientes, unidades consumidoras, alocações, operação, faturamento e financeiro.
- **Andrade Energy Consumidor:** consulta das unidades vinculadas ao CPF da conta, economia, faturas, contrato e notificações.

Os dois aplicativos usam a mesma base de código. A variante é escolhida por `EXPO_PUBLIC_APP_VARIANT` no arquivo `app.config.js`; cada uma possui identificador EAS, pacote Android e ícone próprios.

## Estado implementado

### Gerador

- Abas: Home, Clientes, Usinas, Operação, Faturas, Financeiro e Perfil.
- A aba Clientes trata falhas de carregamento com nova tentativa e pesquisa por nome, CPF/CNPJ, e-mail, telefone e UC, aceitando os formatos retornados pela API.
- Cadastro manual e por PDF de clientes, usinas e unidades consumidoras.
- Cadastro manual de UC exige CPF/CNPJ do titular; no fluxo por PDF, o documento é lido da própria conta de energia.
- Uma unidade consumidora pode ser alocada a uma usina; o card da usina mostra UCs alocadas, energia alocada, restante e média dos últimos 12 meses.
- Importação da conta de energia da usina para registrar produção a partir das leituras, com fator de multiplicação.
- A produção da usina também pode ser importada automaticamente por e-mail: a UC geradora recebe o PDF CEMIG, usa os quatro primeiros dígitos do CPF/CNPJ cadastrado para abri-lo quando protegido e atualiza a competência sem criar fatura de cliente.
- Área de faturas com filtros de abertas, vencidas e pagas, download da conta da concessionária e da fatura unificada.
- Notificações persistem as leituras por usuário para não reaparecerem como não lidas.
- Notificações de fatura vencida, no Gerador, direcionam para a aba **Faturas**, e não diretamente para o documento.
- Os cards de usinas e de detalhe da UC foram simplificados; os fluxos ativos do Gerador usam o mesmo cabeçalho verde com marca, usina selecionada e autonomia.
- Contratos são vinculados à **UC**, e não globalmente ao cliente: cada UC pode ter sua própria vigência, situação e histórico.

### Consumidor

- Ao entrar, o usuário seleciona sua unidade consumidora cadastrada; ele não cria UCs pelo app.
- Abas visíveis: Home, Economia e Contrato. O menu de três linhas mantém Perfil e preferências.
- Home mostra faturas pendentes e permite abrir a fatura; Economia separa documentos da Andrade Energy e contas da concessionária.
- A tela **Faturas** possui um card de destaque **Receba sua conta automaticamente**, que leva diretamente à configuração da UC.
- A experiência visual é definida pela variante aberta. Uma conta de Gerador pode entrar no app Consumidor para consultar as UCs vinculadas ao seu CPF, sem receber o layout administrativo.
- Contrato exibe status, termo de adesão, UC vinculada, vigência, economia estimada e o cancelamento. Cancelamentos de contratos vencidos podem gerar a fatura de encerramento do saldo de compensação da própria UC.
- Cabeçalhos, carregamento e ícones utilizam a identidade Andrade Energy; o app consumidor e o gerador têm variantes visuais distintas.
- Perfil reúne nome completo, CPF somente para consulta, e-mail, telefone, alteração de senha, encerramento de sessão e exclusão/desativação da conta. A exclusão preserva os dados comerciais e bloqueia o novo acesso.
- A biometria é configurada por usuário e por aparelho, pode ser ativada no login ou no Perfil e bloqueia o acesso quando o app volta do segundo plano. A sessão é restaurada sem ser apagada no início do app.
- Em **Receber contas automaticamente**, o consumidor gera um endereço exclusivo da UC e ativa a importação de PDFs. A integração direta via OAuth está implementada, mas só deve ser apresentada como disponível quando as credenciais do provedor estiverem configuradas no Render.

### Atualização de dados

Todas as abas suportam atualização por gesto de puxar a tela para baixo, com comportamento elástico:

- Consumidor: Home, Economia e Contrato.
- Gerador: Home, Clientes, Usinas, Operação, Faturas, Financeiro e Perfil.

As listas também se atualizam ao voltar à tela correspondente.

## Faturamento e regras de energia

- A importação de PDF usada para cadastro somente extrai dados e sugere campos; não deve gerar faturamento automaticamente.
- A fatura unificada preserva a conta da concessionária e calcula separadamente a cobrança de energia da usina, desconto e economia.
- O demonstrativo Andrade é gerado em **uma página A4**, com o logo oficial no cabeçalho. Ao gerar ou regenerar, ele relê a conta CEMIG original arquivada para mostrar titular, CPF/CNPJ, endereço, UC e concessionária exatamente da fonte; se a conta antiga não puder ser lida, usa o cadastro da UC como contingência.
- O PDF traz consumo, energia compensada/injetada, saldo de créditos, composição do total, economia real e gráfico de economia das últimas oito faturas disponíveis. PDFs já existentes no Storage não mudam sozinhos: no Gerador usar **Gerar PDF atualizado** na fatura.
- Boleto e Pix ainda não estão integrados. Em 21/08/2026, duas aplicações novas Checkout Pro do Mercado Pago falharam ao ativar credenciais de teste com erros internos `DXT40`; o atendimento do provedor precisa liberar a conta antes de nova tentativa. Não recriar aplicações por enquanto. O código de barras deve ser impresso somente depois que a cobrança de boleto real for criada e seu código for retornado pela API do provedor.
- Para **compensação**, a cobrança mensal é somente pela energia compensada lida nos campos `Energia Compensada GD1` ou `GD2`. O saldo de créditos é registrado e cobrado apenas no encerramento do contrato.
- Na ausência de energia compensada no PDF, considerar `0 kWh`.
- Para **injeção**, a alocação inicial é 100%, podendo ser ajustada; para compensação, a alocação é sugerida pela média de consumo dos últimos 12 meses e pode ser editada.

Os cálculos com faturas CEMIG, sobretudo GD1/GD2 e tarifas com imposto, ainda devem ser conferidos com PDFs reais antes de uso comercial amplo.

## Backend e infraestrutura

- API de produção configurada: `https://andrade-energy-api-vda.onrender.com/api`.
- Banco, autenticação e armazenamento de PDFs: Supabase.
- PDFs de faturas são armazenados no bucket privado `faturas`, com links temporários para download.
- E-mails transacionais usam Brevo quando as credenciais estiverem configuradas. WhatsApp continua dependente de credenciais e modelo aprovado na Meta.
- Recebimento automático de contas está implementado com Resend Inbound. Uma UC ativa gera um endereço opaco, valida webhook assinado, baixa somente PDFs válidos e confere a UC. Em UC consumidora, cria a fatura em rascunho e aguarda confirmação do gerador; em UC geradora, atualiza a produção da usina e guarda o PDF sem gerar cobrança de cliente. O webhook aponta para `https://andrade-energy-api-vda.onrender.com/api/webhooks/resend/inbound`.
- Fluxo operacional atual: o cliente cria uma regra no **Outlook Web** (o aplicativo Outlook móvel não oferece essa configuração) para encaminhar somente mensagens de `fatura@cemig` com anexo PDF para o endereço exclusivo da UC. Não usar encaminhamento geral da caixa de entrada.
- Conexão direta de caixa de e-mail: OAuth 2.0 com PKCE, estado de uso único e refresh token cifrado com AES-256-GCM já está implementado. Porém, Outlook/Hotmail ainda não está liberado em produção: falta registrar o aplicativo oficial Andrade Energy no Microsoft Entra e informar `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `OAUTH_PUBLIC_BASE_URL` e `OAUTH_TOKEN_ENCRYPTION_KEY` no Render. A conta Hotmail pessoal não possui diretório Entra para esse registro, e a criação via Azure pode exigir conta/assinatura. Quando configurado, a regra automática deve filtrar `fatura@cemig` e anexos, não todos os e-mails CEMIG. Gmail permanece sem regra silenciosa.
- As migrations de recebimento por e-mail, perfil e conexões OAuth já foram aplicadas ao Supabase em 20/08/2026.
- EAS possui perfis separados `preview`, `preview-gerador`, `production` e `production-gerador`.

Uma alteração de ícone, pacote, permissão nativa ou versão requer novo build EAS. Alterações somente em JavaScript/TypeScript podem ser entregues por update OTA quando houver build compatível instalado.

### Publicação mais recente — 21/08/2026

- Commits mais recentes: `0753221` (`Usa dados CEMIG no demonstrativo da fatura`) e `fddcdfe` (`Adiciona logo ao PDF da fatura`).
- O serviço Render está configurado para deploy manual; após enviar uma alteração de backend, usar **Manual Deploy → Deploy latest commit** no painel.
- Atualizações OTA Preview publicadas: Consumidor (`9acd4d63-6ef2-48ce-bd97-ca043ab9e0f2`) e Gerador (`89789091-64a4-45db-bfa5-eab649934ac9`), ambas no runtime `1.0.0`.
- O novo APK Android para aplicar a configuração nativa do `expo-web-browser` não entrou na fila porque a cota gratuita de builds Android do EAS foi usada. A cota informada pelo EAS volta em **01/09/2026**, ou o build pode ser feito em plano com mais capacidade.

## Como executar localmente

Pré-requisito: criar `backend/.env` a partir de `backend/.env.example` e preencher segredos por meio privado. Nunca versionar `.env`.

```powershell
npm.cmd ci
cd backend
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Em outro terminal, na raiz:

```powershell
npm.cmd run start:consumidor -- --clear
npm.cmd run start:gerador -- --clear
```

Por padrão, o app aponta para a API pública do Render. Para desenvolvimento com backend local, iniciar o Expo com `EXPO_PUBLIC_API_URL=http://<IP-DO-PC>:3333/api`; o Windows precisa permitir a porta TCP `3333` na rede local. Em 20/08/2026, o IP local usado foi `192.168.0.141`.

## Validação recente

- TypeScript: `node_modules\\.bin\\tsc.cmd --noEmit --pretty false` passou sem erros.
- Lint Expo passou sem erros.
- Backend: `backend/npm.cmd run build` passou sem erros.
- A configuração Expo foi conferida nas variantes Consumidor e Gerador, incluindo seus schemes de retorno OAuth.

## Próximos testes prioritários

1. Validar no celular o gesto de atualização e a navegação em cada variante.
2. Executar ponta a ponta o cadastro por PDF, alocação, faturamento, download e baixa de uma fatura real de teste.
3. Conferir com novas faturas CEMIG GD1/GD2 se todos os campos de energia compensada, saldo e tarifa foram lidos corretamente.
4. Fazer teste ponta a ponta do Resend para os dois tipos de UC: consumidora deve criar o rascunho de fatura; geradora deve registrar a produção da competência, sem criar cobrança.
5. Se a conexão direta Outlook for desejada, criar o aplicativo Microsoft Entra e configurar as credenciais OAuth no Render; caso contrário, manter o encaminhamento via Outlook Web como fluxo oficial.
6. Validar no celular a ativação, bloqueio e desbloqueio por biometria em ambos os apps.
7. Revisar autorização de todas as rotas do backend e políticas RLS antes da operação em produção.

## Diagnóstico mais recente — 20/08/2026

- O fluxo Hotmail → Resend foi validado: um PDF encaminhado de `fatura@cemig` chegou ao destinatário exclusivo, o webhook respondeu `202` e o processamento terminou com status `PROCESSADO`.
- Caso um e-mail recebido não seja processado, conferir primeiro se a UC correspondente continua com recebimento ativo, se o destinatário exclusivo é o atual e se o CPF/CNPJ do titular contém ao menos os quatro primeiros dígitos necessários para abrir um PDF protegido.
- O Render está configurado para deploy manual. Depois de enviar este commit, executar **Manual Deploy → Deploy latest commit** para ativar as alterações do backend na API pública.
