# Andrade Energy — contexto do projeto

## Lista de UCs, contas vinculadas e tutoriais web — 31/08/2026

- No app Gerador, cada PDF em **Contas vinculadas ao CPF** oferece a ação **Adicionar UC por esta fatura**.
- A área **Unidades** dentro do cliente não repete informações, edição ou WhatsApp do cliente: mostra busca, inclusão e somente a lista das UCs.
- O portal web separa a ficha do cliente em resumo, UCs, contas vinculadas e faturas. As contas anexadas pelo consumidor podem ser abertas e usadas para adicionar a UC diretamente.
- O tutorial web único e antigo deixou de ser exibido. Cada perfil possui cinco vídeos curtos e pesquisáveis, separados por função.

## UCs vinculadas ao CPF e composição da fatura — 31/08/2026

- Consumidores com conta confirmada agora encontram em **Perfil** a área **Contas vinculadas ao CPF**. Ela explica que o envio é exclusivamente de contas da concessionária de pontos de instalação vinculados ao CPF; os PDFs permanecem anexados à ficha do cliente e podem ser escolhidos pelo Gerador ao cadastrar uma UC.
- A Home do Consumidor ganhou o atalho **Anexar conta**. A Home do Gerador ganhou **Faturar via fatura**. O fluxo de UC usa um único seletor de usina: tocar no campo abre a lista de usinas disponíveis, sem duplicar campos quando houver mais de uma.
- O salvamento de alocação de uma UC retorna diretamente para a lista de UCs após confirmar, evitando a necessidade de tocar em salvar uma segunda vez. A prévia do desconto real passa a refletir GD1/GD2, disponibilidade e Fio B conforme as opções de absorção ou repasse.
- A leitura de contas convencionais e GD passou a extrair também custo de disponibilidade e bandeira tarifária. Na composição da fatura, disponibilidade, Fio B, iluminação pública, bandeira, impostos e o saldo de energia/encargos da concessionária ficam separados; a tarifa inteira não é mais classificada indevidamente como imposto quando não existe GD.
- A migration `20260831203000_valor_bandeira_fatura.sql` foi aplicada no Supabase em 31/08/2026. Ela adiciona `faturas.valor_bandeira` com padrão zero, sem alterar faturas existentes.
- Backend publicado no Render pelos commits `378d6cf` e `ad212df`; a checagem pública `GET /health` respondeu `200 {"status":"online"}`.
- OTAs publicadas no runtime `1.0.0`: Consumidor `preview-consumidor`, grupo `71a63075-429b-4fea-8d89-68845db4e5cb`; Gerador `preview-gerador`, grupo `f7244f4c-5f27-497a-8efc-f3fa4cb8200f`. O script `scripts/publish-ota.ps1` usa `CI=1`; a opção obsoleta `--non-interactive` foi removida para compatibilidade com o EAS atual.

## Convites web e notificações Android — 31/08/2026

- O botão **Abrir aplicativo e criar conta** do e-mail do consumidor usa `andradeenergyconsumidor://criar-conta?convite=...` para abrir diretamente o app instalado. O e-mail mantém o link alternativo `https://www.andradeenergy.com.br/convite?convite=...` para quem ainda não o possui.
- Nome, CPF e e-mail são informados pelo gerador ao criar o convite; WhatsApp é opcional. No cadastro da conta, a fatura CEMIG em PDF é opcional: quando enviada, o backend usa os quatro primeiros dígitos do CPF do convite para abrir e conferir o arquivo, compara nome e CPF, extrai o endereço e ativa a conta automaticamente, mantendo o PDF anexado ao cliente. Sem fatura, o cadastro fica pendente de ativação manual pelo gerador. Unidade, modalidade, desconto e parâmetros comerciais permanecem na UC, não na ficha do cliente.
- Avisos importantes do sino (fatura vencida e próxima do vencimento) agora também são espelhados como notificações locais no Android nos dois apps. O mesmo alerta só é emitido uma vez por usuário/dispositivo. O Gerador recebe ainda a confirmação local quando um convite é criado. Não há uso de WhatsApp pago nem envio remoto antes de o consumidor possuir o app.
- Local notifications funcionam no Android instalado e podem solicitar a permissão do sistema quando surgir o primeiro aviso. Para notificações remotas em segundo plano seria necessário registrar tokens do dispositivo no backend e publicar em build de desenvolvimento/produção; o Expo Go não oferece push remoto no SDK 54.
- A migration `20260831090000_onboarding_consumidor_verificado.sql` foi aplicada no Supabase em 31/08/2026. Ela cria `solicitacoes_cadastro_clientes`, necessária para as etapas de confirmação de e-mail e aprovação do gerador.
- A migration `20260831172000_fatura_cadastro_opcional.sql` foi aplicada no Supabase em 31/08/2026. Ela torna o anexo da fatura opcional na solicitação de cadastro, preservando a aprovação manual pelo gerador quando o consumidor optar por não enviar o PDF.
- A migration `20260831180000_faturas_anexadas_clientes.sql` foi aplicada no Supabase em 31/08/2026. Ela cria o histórico privado de contas de energia anexadas pelo consumidor, incluindo a fatura usada no cadastro. O consumidor consulta e anexa PDFs pela aba **Faturas**; o gerador vê a lista dentro do cliente e pode escolher qualquer conta anexada para preencher o cadastro da UC.
- A migration `20260831110000_dados_cadastrais_no_convite.sql` foi aplicada no Supabase em 31/08/2026. Ela adiciona `telefone` e `endereco` a `convites_clientes`, preservando os dados de cadastro até a criação da conta do consumidor.
- Backend publicado no Render no commit `9c5b367` e confirmado **Live** (deploy `dep-daaucrnqj5pc73bal45g`).
- OTAs publicadas no runtime `1.0.0`: Consumidor `preview-consumidor`, grupo `f0c245f6-2f13-41f5-8b6f-60224a7093c4`; Gerador `preview-gerador`, grupo `86735bbd-3171-4e88-be5d-49ab0c29fb15`.

## Visão geral

Plataforma de gestão de energia por assinatura, composta por dois aplicativos Expo SDK 54 e um backend Node/Express com Supabase:

- **Andrade Energy Gerador:** gestão de usinas, clientes, unidades consumidoras, alocações, operação, faturamento e financeiro.
- **Andrade Energy Consumidor:** consulta das unidades vinculadas ao CPF da conta, economia, faturas, contrato e notificações.
- **Portal web:** versão administrativa responsiva em `portal-web`, construída com React/Vite e preparada para publicação no OpenAI Sites. A evolução web deve reaproveitar as mesmas regras, API e identidade visual dos aplicativos, sem criar uma segunda lógica de negócio.

Os dois aplicativos usam a mesma base de código. A variante é escolhida por `EXPO_PUBLIC_APP_VARIANT` no arquivo `app.config.js`; cada uma possui identificador EAS, pacote Android e ícone próprios.

## Estado implementado

### Correção do 404 ao remover gerador — 30/08/2026

- Causa confirmada no Render: serviço ainda executava `3ecb357`, cujo `usuarios.routes.ts` não tinha `DELETE /geradores/:id`. A OTA não publica o backend.
- Deploy manual do último commit remoto `a8fe520d1692e4bef11bef9538d0fb438bc7e73e` confirmado **Live** às 07:57 no painel, deploy `dep-daa0ojpsrm7s73dirhhg`. Inclui os commits de remoção e filtro de contas removidas.
- Build TypeScript local passou. Quatro testes de billing passaram executados no JS compilado (`node --test dist/modules/billing/billing.engine.test.js`); o runner tsx havia falhado por limitação do ambiente Windows.
- Nenhum cadastro real foi excluído para validar. O teste autenticado de remoção deve ser feito pelo usuário no cadastro pretendido; administradores/própria conta seguem protegidos.

### OTA de tutoriais e recuperação do consumidor — 29/08/2026

- Publicadas e conferidas no manifesto público (HTTP 200, runtime 1.0.0): Consumidor grupo `d4a9430b-f1fe-476b-bca1-23b3936c73d3`, Android `01a05048-d25d-7940-a91b-d5c30c55d667`; Gerador grupo `b3d21f27-bf34-49ae-9f4b-f33651a9efd7`, Android `01a05049-d861-7e0e-9327-64c120afcafd`.
- Rota autenticada `/tutoriais`, acessível pelos menus do Consumidor, Usinas e Comercial. Cada variante mostra seu guia. MP4s existentes foram incluídos como assets na OTA; Android usa o reprodutor externo com URI de conteúdo e permissão temporária de leitura, sem adicionar módulo nativo. São guias ilustrados, não gravações reais de processos.
- `expo-asset` declarado diretamente na mesma versão 12.0.13 já transitiva no Expo SDK 54. Não exige nova versão nativa.
- Home recupera cliente_id de UC legada somente consultando unidades autorizadas da sessão e correspondendo à unidade selecionada; nunca usa outro cliente como substituto. Cache separado por usuário/empresa/UC. Erro oferece tentativa, escolha de unidade e novo login quando HTTP 401.
- Validação: TypeScript do código mobile sem erros; três testes simulados de recuperação do dashboard passaram; bundles Android exportados e ambos manifestos incluem os dois MP4s (interface exibe apenas o respectivo perfil). Não houve validação física do reprodutor no aparelho.
- Diagnóstico de energia: schema das consultas válido e resumo calculado com sucesso diretamente para o cliente existente. Causa da falha na sessão do celular ainda não reproduzida.
- Remoção de gerador: consultas válidas e RPC `remover_conta_geradora` presente no catálogo. App explica proteção de administradores/própria conta e mostra erro de sessão/HTTP. Falha relatada ainda precisa do retorno exato do servidor; nenhum gerador real removido em teste. Backend não alterado nem publicado nesta rodada.
- Publicação web e gravações reais de tutoriais continuam pendentes. Estas OTAs não substituem APKs dos links nem confirmam instalação no aparelho.

### Publicação local Android — 29/08/2026

- Consumidor universal compilado e publicado no link estável do release `apps-2026-08-27`: 102963030 bytes; SHA256 `0948bedf7c92e5388456ca932ffa1aa663b5ffff412913e0aa09aabe84c30f2d`. Download completo pelo domínio público conferido com o mesmo hash.
- Gerador universal compilado e publicado no mesmo release: 102862930 bytes; SHA256 `7a5daadd09b39775130aec4804e245ab7616106c5d6a196a23091746ca4292fe`. Pacote, configuração incorporada, canal e assinatura conferidos. Download completo pelo domínio público também conferido com o mesmo hash, após duas falhas transitórias de conexão.
- Ao alternar variantes no mesmo `android/`, o Gradle reutilizava bundle e autolinking do Consumidor. O problema foi corrigido na reconstrução do Gerador: invalidar o JSON gerado de autolinking e usar `scripts/android-variant-inputs.gradle` conforme `scripts/ANDROID-RELEASE.md`.
- Publicação de APK usa `scripts/publish-apk-release.ps1`, que verifica digest e preserva o instalador anterior como asset de backup.
- Não confundir publicação do instalador com OTA ou instalação por ADB: essas etapas não ocorreram nesta atualização.
- OTA: falhas `ECONNRESET` foram reproduzidas em POST GraphQL por IPv6; o mesmo teste por IPv4 respondeu HTTP 200. Priorizar IPv4 no processo Node resolveu o envio sem desativar TLS ou alterar a rede do Windows. Comando reutilizável: `scripts/publish-ota.ps1 -Variant gerador -Message 'Descricao'` (ou consumidor).
- OTA Gerador confirmada: canal `preview-gerador`, runtime `1.0.0`, grupo `edb286a7-7f41-4834-83b5-f692f1e10f44`, update Android `01a05031-abae-76b7-9844-3ad169c8e4b6`.
- OTA Consumidor confirmada: canal `preview-consumidor`, runtime `1.0.0`, grupo `cf5cdbf0-f294-47b5-9aae-b7a162ac5b6d`, update Android `01a05034-370f-792b-a57e-46abd56fa7c4`. As duas publicações terminaram com `Published!`. Recebimento no aparelho ainda depende de abrir o app compatível com internet.
- Alterações locais de Empresas parceiras e tutoriais por perfil ainda exigem o fechamento da publicação. Vídeos web atuais são demonstrações ilustradas, não gravações reais de operação; tutorial prático não está concluído.

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
- O login web do Gerador oferece um fluxo público de teste gratuito: destaque de 45 dias, cadastro com nome, CPF, telefone, e-mail e senha, aceite dos termos, criação automática da conta `GESTOR`, vinculação ao plano ativo mais acessível e tela final com as datas do teste e download do APK Gerador.
- O teste não exige cartão nem gera cobrança automática. Ao final, o gerador entra na área de assinatura e decide se contrata um plano. A elegibilidade é conferida no backend pelo histórico do CPF e o benefício não pode ser renovado por novo cadastro ou reinstalação.
- Os ambientes web de Gestão Comercial e Gestão de Usinas possuem menus separados. Na Gestão Comercial não devem aparecer clientes, UCs, usinas ou faturamento de energia; a troca ocorre somente por **Alternar ambiente**.
- A área **Aplicativos** está disponível diretamente no menu dos perfis Gerador, Consumidor e Administração Comercial do portal, com os APKs oficiais da release `apps-2026-08-27`.
- No app Gerador, a home de Gestão Comercial oferece **Baixar app do Gerador** diretamente no acesso rápido e no menu lateral. O link externo é aberto com a API `Linking` compatível com Expo SDK 54.
- Os cabeçalhos do ambiente comercial no app Gerador seguem formato compacto: logo reduzido, ações laterais de 40 px, títulos sem compressão e bloco de contexto menor nas telas de gestão e monitoramento.
- Atualização OTA Gerador publicada no canal `preview-gerador` com download direto e cabeçalhos comerciais compactos: grupo `38f83b4e-f265-490b-950a-b41de3e6241b`, runtime `1.0.0`.
- A Gestão Comercial do app possui navegação inferior **Home / Carteira / Receita mensal**. Os cards **Assinaturas**, **Ativas** e **Inadimplentes** são acionáveis e abrem, respectivamente, assinaturas, monitoramento de clientes ativos e pagamentos.
- A navegação inferior comercial é fixa e reutiliza o padrão visual das abas da Gestão de Usinas (ícones preenchidos na seleção, indicador verde superior, 82 px e sombra). Ela permanece disponível na home, carteira e receita mensal.
- A Carteira apresenta total confirmado, assinaturas ativas e inadimplentes no card principal; Receita mensal apresenta recebido no mês, valor a receber e a lista das cobranças.
- Clientes ativos usa o cabeçalho compacto padrão e mantém a navegação comercial fixa até o rodapé. Cada cliente é clicável e abre detalhes com plano, status, início, vencimento, quantidade de usinas cadastradas e UCs ativas.
- Os downloads dentro dos apps não dependem mais da navegação do GitHub: o APK é baixado pelo `expo-file-system` para o cache, o botão informa o tamanho durante a espera e o Android abre o instalador por intent ao concluir. Comercial e Gerador oferecem os dois APKs; Consumidor oferece apenas o seu.
- A carteira do Gerador mantém transferência manual e a chave de transferência automática em Financeiro. A assinatura do software ganhou renovação antecipada via checkout; o contrato do Consumidor ganhou solicitação antecipada com confirmação externa antes de qualquer renovação.
- A tela Gestão de Geradores usa o mesmo cabeçalho compacto da home comercial, com logo alinhada ao título e menu lateral de três linhas para todas as áreas comerciais.
- No perfil Gerador, o acesso rápido permite baixar os APKs Gerador e Consumidor. No perfil Consumidor, aparece somente o download do APK Consumidor.
- O início de novos testes gratuitos pelo login web está temporariamente desabilitado; o aviso permanece visível e o formulário não é aberto enquanto `TESTE_GRATUITO_HABILITADO` estiver falso.
- Os downloads web abrem o arquivo oficial em uma nova guia, evitando que o portal fique preso na navegação do APK. Os ativos atuais têm aproximadamente 45 MB (Gerador) e 98 MB (Consumidor).

## Diagnóstico mais recente — 20/08/2026

- O fluxo Hotmail → Resend foi validado: um PDF encaminhado de `fatura@cemig` chegou ao destinatário exclusivo, o webhook respondeu `202` e o processamento terminou com status `PROCESSADO`.
- Caso um e-mail recebido não seja processado, conferir primeiro se a UC correspondente continua com recebimento ativo, se o destinatário exclusivo é o atual e se o CPF/CNPJ do titular contém ao menos os quatro primeiros dígitos necessários para abrir um PDF protegido.
- O Render está configurado para deploy manual. Depois de enviar este commit, executar **Manual Deploy → Deploy latest commit** para ativar as alterações do backend na API pública.

## Ecossistema multiempresa — 28/08/2026

- A Andrade Energy permanece como empresa proprietária, identidade padrão e ambiente inicial. Empresas parceiras são cadastradas dentro do mesmo ecossistema, mas seus dados operacionais ficam isolados por `empresa_id`.
- A migration `20260827213000_ecossistema_multiempresa.sql` foi aplicada ao Supabase. Ela criou `empresas` e `empresa_usuarios`, vinculou os dados existentes à Andrade Energy e adicionou o escopo empresarial às tabelas operacionais.
- Clientes, unidades consumidoras, usinas, faturas, contratos, créditos, fechamentos, carteiras, cobranças Asaas, transferências, recebimento de faturas e conexões de e-mail agora respeitam a empresa da sessão nas rotas críticas.
- A Gestão Comercial global e o cadastro de empresas parceiras são exclusivos do superadministrador da Andrade Energy. Um administrador de empresa parceira não pode consultar a operação comercial global do software.
- O backend oferece `GET /api/empresas/atual` para os aplicativos e portal carregarem nome, logo e cores da empresa ativa. Quando `identidade_personalizada` estiver desativada ou ocorrer falha, a interface usa Andrade Energy como fallback.
- O app possui `EmpresaProvider`, usado pelo cabeçalho compartilhado para aplicar a cor e o logo da empresa ativa. O portal autenticado também carrega essa identidade e oferece a área **Empresas** na Gestão Comercial para cadastrar novas parceiras.
- Commits de fundação e isolamento: `21cd68e`, `3cfda9d`, `621958d`, `08d8075`, `ffb1eab` e `682ca59`.
- Antes do deploy, ainda é obrigatório concluir testes explícitos de acesso cruzado entre duas empresas e revisar as políticas RLS das tabelas operacionais. Não publicar a camada multiempresa apenas porque o build passou.
- O backend multiempresa foi publicado no Render em 28/08/2026 no commit `a07fbe9`. O deploy terminou como `live`, `/health` respondeu `200` e as rotas `/api/dashboard/cliente` e `/api/empresas/atual` responderam `401` quando chamadas sem sessão.
- A validação de acesso cruzado com duas empresas continua necessária antes de cadastrar a primeira parceira real; o deploy atual protege a operação existente da Andrade Energy e disponibiliza a infraestrutura para esse teste controlado.
- Atualizações OTA multiempresa publicadas em 28/08/2026, runtime `1.0.0`: Consumidor no canal `preview-consumidor`, grupo `864109b1-cd8d-4e74-91cc-c597f200da3b`; Gerador no canal `preview-gerador`, grupo `3863eda8-3e2f-4f59-995d-2951c2d20eb7`.
- As atualizações OTA incluem identidade dinâmica da empresa, proteção das rotas críticas e seleção explícita dos canais por variante. Alterações nativas futuras em plugins, ícones ou configuração do aplicativo continuarão exigindo uma nova build APK/AAB.
- O portal web foi adaptado para usar nome, logo, cores e e-mail de suporte da empresa ativa, inclusive no cabeçalho compacto, navegação, destaques e layout móvel. A área global **Empresas** permanece exclusiva da Gestão Comercial Andrade Energy. O build de produção passou e a alteração está no commit `373cbd4` do repositório Sites local.
- A publicação dessa versão no projeto Sites oficial continua bloqueada porque o projeto `appgprj_6a8c66b15ba48191baad8777fd2d1eba` não está acessível pela conta Sites atualmente conectada; o conector respondeu `Sites project not found` e o envio Git não obteve credencial. É necessário conectar a conta proprietária do projeto para publicar em `www.andradeenergy.com.br`, sem criar ou substituir o projeto oficial.
- O APK Consumidor anterior não possuía o cabeçalho nativo `expo-channel-name`, por isso não recebia a OTA mesmo com a atualização publicada. Em 28/08/2026 foi gerado um novo APK universal com o canal `preview-consumidor`, validado diretamente no `AndroidManifest.xml`, e o ativo `andrade-energy-consumidor.apk` da release `apps-2026-08-27` foi substituído sem alterar o link usado pelo portal.
- O app Gerador agora expõe **Empresas parceiras** na seleção administrativa, no menu da Gestão de Usinas e no acesso rápido Comercial. A tela permite cadastrar e editar identidade, domínio, suporte, logo e cores; os cabeçalhos principais, seleção de usina e subtelas operacionais usam a identidade da empresa da sessão, mantendo Andrade Energy como padrão.
- Geradores com assinatura `ATIVA` ou `TESTE` agora possuem infraestrutura própria de identidade visual em `identidades_geradores`; a migration `20260828175000_identidade_visual_geradores.sql` foi aplicada ao Supabase. A API expõe `GET/PATCH /api/empresas/minha-identidade` e `GET /api/empresas/atual` mescla a marca do gerador na sessão sem trocar o isolamento da empresa.
- O rodapé da fatura Andrade Energy passou a usar quatro colunas com larguras inteiras e altura/baseline uniformes, eliminando o desalinhamento entre saldo, créditos gerados, créditos usados e próxima leitura. A visualização da fatura no app também centraliza rótulos e valores com altura consistente.
- O portal Sites versão 37 corrige o dimensionamento da Administração multiempresa em desktop e mobile, limita a lista longa de empresas sem expandir toda a página e reforça o contraste do resumo da operação comercial mesmo quando há uma identidade visual clara.
- A versão web consolidada passou a ser a 38: o Gerador ganhou **Minha marca**, com prévia e edição da identidade quando a assinatura está ativa/em teste; os downloads Android usam navegação direta no celular e exibem spinner, texto e barra animada enquanto o arquivo inicia.
- Os cards principais de Economia e Contrato do app Consumidor deixaram de usar o azul legado e adotaram verde escuro com detalhes da identidade Andrade Energy.
- Geradores passaram a ser selecionáveis na web e no app: a lista comercial abre informações de conta, contato, assinatura, plano, vencimento, quantidade de usinas e UCs ativas. O app possui a rota dedicada `app/geradores/[id].tsx`.
### 2026-08-28 - Composição da fatura no consumidor

- A aba Economia do aplicativo consumidor passou a exibir um gráfico de rosca interativo com os valores reais da última competência.
- A composição separa energia Andrade, concessionária, disponibilidade e Fio B somente quando essas parcelas existem; em fatura somente Andrade, separa cobrança e economia concedida.
- Cada item do gráfico pode ser expandido para explicar a origem do valor, sem estimativas artificiais de tributos.
- A fatura da usina preserva o modelo aprovado em uma única página; a composição foi compactada ao lado da área de pagamento e destaca no centro o valor da fatura Andrade.
- Leituras anterior/atual, fator, classificação, tensão e tipo de ligação agora são persistidos por competência e recuperados da conta original ao regenerar documentos antigos. Se a conta não informar tensão, o PDF mostra o tipo de ligação sem estimar uma tensão.
- O demonstrativo passou a usar fundo verde suave, total a pagar em alto contraste e composição detalhada com kWh da usina, disponibilidade, Fio B, iluminação pública e impostos quando encontrados na conta original.
# Atualização — tutoriais por função (30/08/2026)

- Central de tutoriais dos apps ampliada com 24 novos vídeos curtos: 15 do Gerador e 9 do Consumidor.
- Conteúdo capturado no aparelho real, narrado com Francisca +10%, trilha instrumental baixa e marcações vermelhas nos botões efetivamente tocados.
- Dados pessoais foram ocultos; formulários são apresentados sem salvar alterações ou simular transações concluídas.
- Prioridades incluídas: recebimento automático (endereço ativo, Gmail e Outlook), multiempresas, identidade própria (logo e cores), carteira, operação, usinas, UC e contrato.
- Multiempresas e identidade própria são demonstradas como recursos administrativos. A UC usada na gravação já estava com recebimento ativo; o vídeo não afirma que uma nova ativação foi concluída.
- Cabeçalho de escolha de UC confirmado no aparelho com nome em linha própria, sem conflito com a logo.
# Atualização de tutoriais — 30/08/2026

- Os 24 vídeos do novo lote de tutoriais dos apps Gerador e Consumidor foram reeditados.
- O ritmo visual foi reduzido em 20% para facilitar o acompanhamento.
- A marcação vermelha deixou de usar o traço oscilante e agora é lisa e estável.
- A posição e o tamanho da marcação são calculados pelos limites reais do botão capturado em cada tela.
- A marcação é concluída e removida antes do toque, evitando aparecer sobre a tela seguinte.
- Os 24 arquivos passaram por decodificação integral sem erros e as duas variantes Expo foram exportadas com sucesso.
- OTA Gerador: grupo `969e7592-dab7-4386-8d14-97136c51b429`.
- OTA Consumidor: grupo `fbd6aa54-54f2-4a9c-ac2e-d353158bed04`.
# Publicação de tutoriais e login web — 31/08/2026

- Os 24 vídeos de tutorial dos apps foram reprocessados em 30 fps, sem desfoque geral e na velocidade natural.
- As marcações vermelhas aparecem aproximadamente 2 segundos antes do toque e desaparecem antes da troca de tela.
- A narração passou a ser sincronizada com os tempos reais das ações capturadas.
- OTA Gerador: grupo `3eead04d-caea-44c9-99ff-6b5ff1a41f81`.
- OTA Consumidor: grupo `e8a1644d-8140-4211-9d33-88b6894e7ae1`.
- Na web, “Lembrar de mim” agora salva e restaura somente o e-mail e o perfil escolhido; a senha não é armazenada.
- A central “Tutoriais da web” foi movida para o menu lateral, abaixo de “Alternar ambiente”, e removida da área de aplicativos.
- A central de tutoriais recebeu campo de pesquisa e estado “Nenhum tutorial encontrado”.
- Portal Sites publicado como versão 53 no projeto oficial vinculado a `www.andradeenergy.com.br`.

# Organização de clientes, UCs e identidade dos cards — 31/08/2026

- A tela de detalhes do cliente foi reorganizada em resumo e áreas acessadas por atalhos: **Unidades**, **Faturas**, **Contas anexadas** e **Validação**. No resumo permanecem os dados do cliente, edição, WhatsApp, economia total e gráfico do histórico de consumo.
- O cadastro de UC a partir de uma fatura anexada passou a exibir, antes do primeiro salvamento, modalidade, usina, consumo médio, percentual alocado, desconto e configurações GD. Após salvar, retorna diretamente ao cliente.
- A alocação inicial por compensação usa 115% do consumo médio em relação à produção média da usina; por injeção inicia em 100%, mantendo edição antes de salvar.
- A projeção de desconto real reage em tempo real ao desconto e às escolhas de repasse/absorção. Quando a primeira conta ainda não possui GD, usa consumo e tarifa extraídos como base estimada, sem manter o percentual estático.
- O padrão global dos cards dos dois apps deixou o cinza legado e passou a usar verde muito claro `#F2F8F4`, com borda suave `#C9DED1`. Foram atualizados também cards explícitos de login, convites, seleção de UC, faturas, pagamentos, economia, usinas e acessos rápidos.
- Cada variante Android declara também `android.scheme` próprio. Para eliminar a oferta indevida do app Gerador ao abrir convite de consumidor, os APKs precisam ser regenerados com `expo prebuild --clean`; OTA não altera filtros nativos de link.

# Publicação — UCs por faturas vinculadas e tutoriais web (01/09/2026)

- No Gerador, cada conta anexada ao CPF do cliente passou a oferecer **Adicionar UC por esta fatura**; a lista de UCs exibe somente as unidades, sem repetir os dados e os controles de edição do cliente.
- A web recebeu a mesma organização do cliente, cadastro de UC por conta vinculada e uma central renovada com cinco tutoriais por perfil; o vídeo único antigo deixou de ser usado.
- Portal oficial publicado na versão 54 (`www.andradeenergy.com.br`).
- OTA Gerador: grupo `274fb35d-9e5a-47b7-b28a-ede4498b2179`.
- OTA Consumidor: grupo `e2cbb3cc-227a-49aa-b358-0bafc3aa99cb`.
- APK Gerador oficial: SHA-256 `A2CA2112579E0BB32AF9A9081ACEC6C66CAFCE36E77BC1575AF93E67BB01ED45`.
- APK Consumidor oficial: SHA-256 `DA2379C670B01E52150587B6FB0F59FE3D82CAE33D040B8544C91F5DF0778608`.
- Os dois APKs foram reconstruídos nativamente e publicados no release estável `apps-2026-08-27`.

# Projeção de desconto e origem do PDF da UC (01/09/2026)

- O botão **Adicionar UC via PDF** no perfil do cliente passou a oferecer duas origens no mesmo fluxo: uma conta já vinculada ao CPF/perfil ou um novo PDF armazenado no aparelho.
- A projeção do desconto real foi alinhada ao motor de faturamento: usa energia compensada/injetada conforme a modalidade, substitui a energia convencional pela tarifa Andrade em contas ainda sem GD e preserva a parcela remanescente da concessionária em contas com GD.
- As escolhas de absorção ou repasse da disponibilidade e do Fio B agora recalculam a projeção sobre a mesma base de energia cheia usada no faturamento.
- OTA Gerador: grupo `1cbec3a3-6d71-4cec-a97a-0876fc1441b3`.
- OTA Consumidor: grupo `bb30143f-7a8b-4b81-9234-6bbc948493ca`.

# Conta vinculada, cobrança separada e tutoriais web (01/09/2026)

- Ao escolher **Adicionar UC por esta fatura**, os dados da conta anexada passam a ter prioridade sobre competências antigas da mesma UC. Consumo, tarifa, modalidade GD, disponibilidade, Fio B e endereço seguem para o primeiro cadastro.
- A projeção distingue as modalidades: compensação usa somente Energia compensada GD I/GD II; injeção usa a energia injetada identificada. O consumo é usado como estimativa apenas antes da primeira conta GD.
- As configurações GD e a projeção permanecem visíveis em **Somente Andrade Energy**. Nesse formato, a economia real considera conjuntamente a conta paga à concessionária e a cobrança Andrade, embora os documentos sejam separados.
- A central web foi reduzida a tarefas de várias etapas. Todos os vídeos partem da Home, usam narração Francisca a +10%, trilha a 8%, 30 fps e marcação vermelha antes dos cliques.
- Gerador: convite até UC, recebimento automático, faturamento pela conta e multiempresa/identidade. Consumidor: vincular conta ao CPF e entender/pagar a fatura.
- Os dez tutoriais simples/antigos foram removidos do portal.
- Publicação concluída no commit funcional `750f777`.
- OTA Gerador: grupo `08b46f56-dce6-41f3-b1dd-aaac79bd7dc0`.
- OTA Consumidor: grupo `d272ac17-5fac-4e47-a167-f145c2e90c86`.
- Portal Sites publicado como versão 55 no projeto oficial vinculado a `www.andradeenergy.com.br`.

# Reprocessamento de anexos e troca de aparelho (01/09/2026)

- Faturas anexadas antigas que continham somente os dados cadastrais passam a ser reabertas automaticamente pelo backend. O PDF original é desbloqueado com os quatro primeiros dígitos do CPF, reanalisado e atualizado com consumo, histórico de 12 meses, tarifa, total e dados GD.
- A média de consumo também aceita os nomes de campos legados `historicoConsumo`, `historico_consumo`, `consumo_kwh` e `consumoFaturado`.
- Validação real do anexo existente recuperou consumo de 68 kWh, 12 competências do histórico, tarifa cheia e valor total, liberando a projeção dinâmica do desconto.
- Quando uma conta é acessada em outro aparelho e a sessão atual é substituída, o app mostra as opções **Entrar neste aparelho** ou **Voltar ao login**, em vez de repetir silenciosamente o erro de sessão expirada.
- Quando a conta importada ainda não possui GD, a configuração exige uma escolha exclusiva entre **GD I** e **GD II** para a projeção. Selecionar uma desativa a outra; se a fatura já identificar GD, somente as opções correspondentes são apresentadas.
- OTA de sessão e recuperação dos anexos: Gerador `57d2d5ac-03a0-42de-8416-f822f482a189`; Consumidor `479bf6c6-6134-4b96-9840-0914cfe8e1e8`.
- OTA final do Gerador com seleção exclusiva de GD: `8728264a-d3e4-451d-b08d-8719b12377ad`.
- Contas com perfil `ADMIN` são exceção à sessão única e podem permanecer conectadas simultaneamente no app e na web. Perfis `GESTOR` e `LEITURA` continuam limitados ao acesso mais recente.
- Na projeção de uma conta ainda sem GD, a seleção GD I/GD II é tratada como cenário de simulação, não como leitura GD existente. A base permanece sendo o consumo mensal da conta e o resultado muda imediatamente ao alterar tipo GD, desconto, disponibilidade ou Fio B.
- O parser convencional preserva as linhas da NF e extrai tipo de ligação, franquia de 30/50/100 kWh, tarifa sem impostos, bandeira e iluminação. Quando a conta ainda não possui linha explícita de disponibilidade, o custo projetado é `franquia × (tarifa cheia − tarifa sem impostos)`.
- Em contas ainda sem GD, a projeção monta a futura parcela da concessionária somente com bandeira, iluminação e os custos de disponibilidade/Fio B que estiverem marcados como repassados. Custos absorvidos não são adicionados, fazendo cada configuração alterar o desconto real imediatamente.
- GD I preserva o crédito do kWh pela tarifa cheia e nunca recebe defasagem de Fio B. GD II usa a diferença real `tarifa SCEE − tarifa compensada GD II`; antes da primeira conta GD II, a tela identifica explicitamente uma estimativa provisória de 13% da energia cheia, sem confundi-la com impostos.
- Quando a conta ainda não possui qualquer leitura GD, a projeção de desconto real retorna `0,00%`, mas os controles de configuração da UC permanecem editáveis para preparação do contrato. A tela informa claramente quando a modalidade ainda não foi identificada.
- No app Gerador, somente contas `ADMIN` podem restaurar o cadastro direto de cliente por fatura. Gestores comuns permanecem exclusivamente no fluxo de convite; a edição continua disponível após o cliente entrar na carteira.
- Quando a conta possui GD, o tipo identificado no PDF tem prioridade sobre valores antigos da UC: GD I exibe somente configurações GD I, GD II somente configurações GD II e uma conta realmente mista libera ambas.
- A usina possui modalidade regulatória `tipo_gd` (`GD1` ou `GD2`), preenchida também pela leitura do PDF no cadastro. Quando a usina é GD II, toda UC beneficiária vinculada herda obrigatoriamente `GD2`; na UC isso aparece apenas como informação, enquanto desconto, formato, disponibilidade e diferença do Fio B continuam editáveis. O backend reforça a mesma regra ao salvar.
- A modalidade exibida e usada nos cálculos da UC vem exclusivamente de `usinas.tipo_gd`; a fatura da UC não altera essa configuração. No cadastro de usina via PDF, GD I/GD II é somente leitura e deve ser identificado pela conta. A alocação automática usa a média dos últimos 12 fechamentos e, se eles ainda não existirem, `usinas.geracao_media`.
- O parser devolve explicitamente `tipoGd` ao encontrar as linhas GD I/GD II. No cadastro da usina por PDF essa modalidade não é selecionável: ela é gravada na usina e passa a ser a única fonte regulatória das UCs vinculadas.
- A leitura atual menos a anterior, multiplicada pelo fator da conta geradora, preenche a geração média inicial quando ainda não há 12 fechamentos. Com consumo médio e produção disponíveis, a alocação sugerida é preenchida automaticamente (`115% do consumo ÷ produção` em compensação e `100%` em injeção).
- A tabela compactada de medição da CEMIG é pesquisada no PDF inteiro, pois o cabeçalho de datas pode aparecer mais de 700 caracteres antes da linha do medidor. No PDF validado, `2.507 − 2.214 × 1` preenche corretamente `293 kWh` como base inicial.
- No cadastro da UC por fatura, o documento vem exclusivamente do PDF como quatro primeiros dígitos mascarados (`0000.***.***-**`), sem copiar o CPF completo do cliente. O valor parcial é persistido na UC e pode ser substituído posteriormente.
- Uma conta ainda sem linhas GD calcula a projeção quando a usina já possui `tipo_gd`: usa consumo e tarifa da conta como cenário, aplicando em tempo real desconto, disponibilidade e Fio B. O resultado só permanece zerado quando também não existe modalidade definida na usina.
- A projeção da UC usa a média dos últimos 12 meses informada no formulário, e não mistura o consumo de uma competência com o total de outra. Para conta convencional, o cenário sem Andrade é `consumo médio × tarifa cheia + encargos obrigatórios`; o cenário unificado substitui a energia pela tarifa Andrade e acrescenta somente disponibilidade/Fio B configurados para repasse.
- Ao reabrir a edição antes da primeira fatura processada, o app recupera a conta anexada do cliente correspondente à UC. Assim a projeção não perde tarifa, disponibilidade, bandeira e iluminação depois do cadastro.
- O desconto real é `economia ÷ valor total sem Andrade`, incluindo os encargos obrigatórios no denominador. Em GD II, a referência esperada é aproximadamente 23% ao absorver somente Fio B, 27% ao absorver somente disponibilidade e próxima de 40% ao absorver ambos; iluminação, bandeiras e outros encargos impedem que o último cenário seja exatamente 40%.
- A disponibilidade é distinta por modalidade: em GD I, `franquia (30/50/100 kWh) × tarifa sem impostos`; em GD II, `franquia × (tarifa cheia − tarifa unitária compensada)`. O parser preserva os dois valores e o cálculo escolhe exclusivamente o correspondente ao `tipo_gd` da usina.
- Contas com troca de medidor preservam todas as linhas da tabela técnica. Cada medidor é calculado isoladamente por `(leitura atual − leitura anterior) × constante de multiplicação`; a produção mensal soma somente linhas `Energia Injetada`, nunca linhas genéricas `Energia kWh`. No exemplo `Usina Andrade E.pdf`, o novo `GPC262102808` usa constante 40 e registra consumo/injeção zero, enquanto o antigo `APK258169009` registra `3.238 − 2.800 × 1 = 438 kWh` de consumo; portanto a produção correta da competência é 0 kWh.
# Atualização 01/09/2026 — UC geradora, investimento e e-mails

- O dashboard da usina agora recupera automaticamente a UC geradora pelo número da instalação quando o vínculo estiver ausente, permitindo criar o endereço de recebimento de produção por e-mail.
- A edição da usina cria ou atualiza a UC geradora, em vez de apenas tentar atualizar um registro que poderia não existir.
- O investimento da usina passou a usar máscara monetária brasileira e é persistido como valor numérico.
- Campos de e-mail do cadastro, convites, clientes e empresas agora normalizam o texto e bloqueiam endereços inválidos; o backend também valida o e-mail de suporte.
- Se uma fatura de cadastro da usina não identificar GD I ou GD II, o usuário escolhe a modalidade manualmente. Quando identificada, a modalidade continua automática.
- Enquanto a escolha não for feita, GD I e GD II ficam sem seleção e um aviso discreto pede a confirmação manual, sem criar um terceiro botão.
- No cadastro de usina, uma linha de energia compensada não basta para definir a modalidade: sem produção/injeção comprovada no período, GD I/GD II ficam para confirmação manual.
- A criação da usina e de sua UC geradora agora é feita pelo backend autenticado, evitando bloqueio da política RLS em `unidades_consumidoras`.
- Os botões GD I e GD II permanecem sempre visíveis; quando a modalidade vem do PDF, o correspondente fica selecionado sem substituir os botões por texto.
- A coluna `unidades_consumidoras.cpf_titular` foi reforçada por migração idempotente com recarga do cache do PostgREST, evitando erro de coluna ausente no cadastro da usina.
- O backend remove `cpf_titular` do objeto persistido em `usinas` tanto no serviço quanto no repositório; o documento pertence exclusivamente à UC geradora. O `/health` informa o commit publicado para facilitar a conferência do Render.
- A projeção de desconto da UC usa a mesma base do faturamento final: energia cheia do consumo para GD II e crédito efetivo para GD I. A fatura original anexada tem prioridade sobre a fatura processada, preservando SCEE e a tarifa GD II para recalcular o Fio B ao vivo.
