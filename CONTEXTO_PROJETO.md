# Andrade Energy — contexto do projeto

## Visão geral

Plataforma de gestão de energia por assinatura, composta por dois aplicativos Expo SDK 54 e um backend Node/Express com Supabase:

- **Andrade Energy Gerador:** gestão de usinas, clientes, unidades consumidoras, alocações, operação, faturamento e financeiro.
- **Andrade Energy Consumidor:** consulta das unidades vinculadas ao CPF da conta, economia, faturas, contrato e notificações.
- **Portal web:** versão administrativa responsiva em `portal-web`, construída com React/Vite e preparada para publicação no OpenAI Sites. A evolução web deve reaproveitar as mesmas regras, API e identidade visual dos aplicativos, sem criar uma segunda lógica de negócio.

Os dois aplicativos usam a mesma base de código. A variante é escolhida por `EXPO_PUBLIC_APP_VARIANT` no arquivo `app.config.js`; cada uma possui identificador EAS, pacote Android e ícone próprios.

## Estado implementado

### Atualização de 26/08/2026 — gestão comercial

- O administrador possui uma área própria de gestão comercial de contas geradoras no portal e no app Gerador.
- Planos de software aceitam ciclos mensal e anual, limites de usinas/clientes, recursos e preço contratado.
- Assinaturas de geradores têm estados de teste, ativa, inadimplente, suspensa e cancelada, sem se misturar às faturas de energia dos consumidores.
- O administrador pode vincular plano, gerar cobrança Asaas, suspender, reativar ou cancelar. O webhook diferencia pagamentos comerciais por `externalReference` e atualiza cobrança e inadimplência.
- A migration `20260826100000_gestao_comercial_geradores.sql` cria planos, assinaturas, cobranças SaaS, documentos comerciais e aceites versionados. Ela precisa ser aplicada antes de publicar o backend correspondente.
- Contrato SaaS, Termos de Uso, Política de Privacidade e cancelamento possuem rascunhos operacionais; a comercialização depende de revisão jurídica e fiscal.
- Para reduzir risco de reprovação na Play Store, o Android não contém checkout nem link de compra externa. A contratação comercial ocorre pelo portal/equipe administrativa. Se a assinatura digital passar a ser vendida dentro do Android, será necessário implementar Google Play Billing e validação de compras no backend.

### Atualização de 25/08/2026

- O portal do consumidor não exibe mais ferramentas administrativas da fatura. O consumidor mantém acesso aos documentos e meios de pagamento; regeneração, confirmação e baixa manual continuam exclusivas do Gerador.
- Ao confirmar ou processar uma fatura aberta, o backend tenta criar/atualizar automaticamente a cobrança Asaas e regenera o demonstrativo com PIX, boleto e código de barras retornados pelo provedor.
- A identidade visual dos apps Consumidor e Gerador foi aproximada da web: fundo verde-cinza claro, superfícies suavemente esverdeadas e cabeçalhos em verde profundo.

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
- Em 24/08/2026 foi escolhida a **Asaas** como alternativa temporária para boleto e Pix enquanto o Mercado Pago permanece bloqueado. A conta sandbox está em configuração; credenciais e tokens devem ficar apenas nas variáveis seguras do backend/Render e nunca no aplicativo, portal web, repositório ou contexto. A integração ainda não deve ser considerada concluída até criar uma cobrança de teste, receber o webhook e confirmar Pix, boleto e código de barras de ponta a ponta.
- Para **compensação**, a cobrança mensal é somente pela energia compensada lida nos campos `Energia Compensada GD1` ou `GD2`. O saldo de créditos é registrado e cobrado apenas no encerramento do contrato.
- Na ausência de energia compensada no PDF, considerar `0 kWh`.
- Para **injeção**, a alocação inicial é 100%, podendo ser ajustada; para compensação, a alocação é sugerida pela média de consumo dos últimos 12 meses e pode ser editada.
- Cada UC define separadamente se a Andrade **repassa ou absorve** o custo de disponibilidade recalculado em GD I e em GD II. Para GD II, também define o repasse ou absorção da diferença do Fio B. Essas opções somente alteram a parcela correspondente; os demais encargos da concessionária continuam fora da absorção.
- Na fatura unificada, disponibilidade e Fio B absorvidos são deduzidos da parcela da concessionária repassada ao cliente; a remuneração da energia solar permanece calculada por energia faturada × tarifa Andrade. O demonstrativo preserva o valor original CEMIG, mostra os custos assumidos pela usina e apresenta a parcela CEMIG líquida, cujas parcelas somam exatamente o total unificado.
- Na GD II CEMIG, o Fio B monetário é calculado por `energia compensada GD II × (tarifa Energia SCEE Isenta − tarifa Energia compensada GD II)`. Não usar a tarifa cheia nessa diferença, pois ela inclui outros componentes e impostos.
- O cadastro e a edição da UC exibem a fórmula do desconto real e explicam dinamicamente o impacto das escolhas de repasse/absorção. O valor exato permanece dependente da fatura de cada competência.

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

### Publicação mais recente — 23/08/2026

- Commits mais recentes de interface: `7cbd8ce` corrigiu o import do formatador de datas que impedia o bundle Android; `e061fef` passou a exibir competência como `MM/AAAA` nos cards da aba Faturas e mantém datas completas em `DD/MM/AAAA`.
- O serviço Render está configurado para deploy manual; após enviar uma alteração de backend, usar **Manual Deploy → Deploy latest commit** no painel.
- A migration `20260823090000_opcoes_gd2_uc.sql` precisa ser aplicada no Supabase antes do deploy que contém as opções de disponibilidade GD I/GD II e Fio B; ela adiciona as configurações por UC e registra os valores na fatura.
- A migration `20260824120000_valores_absorvidos_fatura.sql` precisa ser aplicada antes do backend com o cálculo líquido de absorção; ela preserva o total CEMIG original e registra a parcela CEMIG do cliente, a disponibilidade absorvida e o Fio B absorvido.
- Atualizações OTA Preview publicadas: Consumidor (`9acd4d63-6ef2-48ce-bd97-ca043ab9e0f2`) e Gerador mais recente (`92113c3b-91af-4b42-8925-7dc219fb4f5f`), ambas no runtime `1.0.0`.
- O novo APK Android para aplicar a configuração nativa do `expo-web-browser` não entrou na fila porque a cota gratuita de builds Android do EAS foi usada. A cota informada pelo EAS volta em **01/09/2026**, ou o build pode ser feito em plano com mais capacidade.
- Como o APK Gerador anterior instalado diretamente pelo PC não estava recebendo o canal OTA esperado, em 23/08/2026 foi criado localmente um APK release arm64 com o commit `e061fef` e instalado via ADB Wi-Fi no aparelho `SM-G975F`. O artefato local fica em `android/app/build/outputs/apk/release/app-release.apk`; o diretório nativo `android/` é gerado e não deve ser versionado.
- O mesmo APK Gerador foi instalado no segundo aparelho `SM-S911B`. Depois foi gerado um APK release arm64 da variante Consumidor, com o ícone nativo atualizado, e instalado nos aparelhos `SM-G975F` e `SM-S911B`. Gerador (`com.andradese.energy.gerador`) e Consumidor (`com.andradese.energy.consumidor`) permanecem como aplicativos separados no Android.

### Desenvolvimento local e versão web — 24/08/2026

- Os APKs release arm64 das duas variantes foram gerados localmente neste PC, sem consumir a cota EAS, usando Java 17, Android SDK e Gradle locais. Os pacotes validados são `com.andradese.energy.consumidor` e `com.andradese.energy.gerador`, ambos na versão `1.0.0`.
- Consumidor e Gerador foram instalados/atualizados no aparelho `SM-S911B` por depuração ADB via Wi-Fi, preservando os dados das instalações existentes. Códigos, portas e endereços temporários de pareamento não devem ser registrados no projeto.
- Os APKs em `dist-apk/` são artefatos locais e não são versionados. Novos builds locais devem continuar separados por variante e arquitetura.
- O portal administrativo existente foi incorporado ao repositório principal em `portal-web/`. Ele contém áreas de visão geral, clientes, unidades, usinas, faturas, contratos, cobranças, equipe, importações, atividades, configurações e perfil.
- A próxima evolução deve transformar o portal em uma **versão web operacional do Andrade Energy**, conectada à mesma API do Render e ao mesmo Supabase, mantendo permissões e regras idênticas ao app Gerador. Não duplicar cálculos de faturamento, alocação, contratos ou cobrança no frontend web: essas regras continuam centralizadas no backend.
- Antes de liberar a versão web em produção, validar autenticação, autorização por perfil, responsividade, downloads de PDF, upload de contas/contratos, faturamento, gestão de geradores e proteção de segredos. A publicação web deve usar variáveis de ambiente próprias e nunca expor chaves administrativas do Supabase ou tokens de provedores de pagamento.

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

## Gestão comercial e distribuição Android — 27/08/2026

- A gestão comercial foi ampliada no aplicativo e no portal web com receita mensal, carteira, pagamentos, assinaturas, planos e monitoramento dos clientes ativos com dias decorridos.
- O período de teste do app Gerador é de 45 dias e pode ser concedido somente uma vez por CPF. O backend consulta o histórico de assinaturas de todas as contas que compartilham o CPF normalizado; reinstalar o aplicativo ou recriar o usuário não renova o teste.
- O pagamento do software continua separado das faturas de energia. Boleto, Pix, cartão e recorrência são opções comerciais processadas pelo provedor de cobrança.
- O portal web recebeu navegação e layout responsivos para celular, inclusive na gestão comercial, tabelas, formulários, monitoramento e botões de instalação.
- O portal público oficial está vinculado ao projeto Sites original `appgprj_6a8c66b15ba48191baad8777fd2d1eba` e é publicado em `https://www.andradeenergy.com.br`. Não substituir esse vínculo por outro projeto Sites ao trabalhar em contas diferentes.
- Foram gerados localmente os APKs atuais: `dist-apk/andrade-energy-gerador.apk` (arm64) e `dist-apk/andrade-energy-consumidor.apk` (universal). Eles não são versionados no Git e são publicados como ativos da release `apps-2026-08-27`.
- Os links estáveis de download usados pelo portal apontam para a release GitHub `apps-2026-08-27` e podem ser sobrescritos por `VITE_APP_GERADOR_DOWNLOAD_URL` e `VITE_APP_CONSUMIDOR_DOWNLOAD_URL`.
- O backend e o portal passaram na compilação de produção; as telas alteradas dos aplicativos passaram no ESLint direcionado.

## Diagnóstico mais recente — 20/08/2026

- O fluxo Hotmail → Resend foi validado: um PDF encaminhado de `fatura@cemig` chegou ao destinatário exclusivo, o webhook respondeu `202` e o processamento terminou com status `PROCESSADO`.
- Caso um e-mail recebido não seja processado, conferir primeiro se a UC correspondente continua com recebimento ativo, se o destinatário exclusivo é o atual e se o CPF/CNPJ do titular contém ao menos os quatro primeiros dígitos necessários para abrir um PDF protegido.
- O Render está configurado para deploy manual. Depois de enviar este commit, executar **Manual Deploy → Deploy latest commit** para ativar as alterações do backend na API pública.
