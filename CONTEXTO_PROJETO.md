# Andrade Energy — contexto do projeto

## Visão geral

Plataforma de gestão de energia por assinatura, composta por dois aplicativos Expo SDK 54 e um backend Node/Express com Supabase:

- **Andrade Energy Gerador:** gestão de usinas, clientes, unidades consumidoras, alocações, operação, faturamento e financeiro.
- **Andrade Energy Consumidor:** consulta das unidades vinculadas ao CPF da conta, economia, faturas, contrato e notificações.

Os dois aplicativos usam a mesma base de código. A variante é escolhida por `EXPO_PUBLIC_APP_VARIANT` no arquivo `app.config.js`; cada uma possui identificador EAS, pacote Android e ícone próprios.

## Estado implementado

### Gerador

- Abas: Home, Clientes, Usinas, Operação, Faturas, Financeiro e Perfil.
- Cadastro manual e por PDF de clientes, usinas e unidades consumidoras.
- Uma unidade consumidora pode ser alocada a uma usina; o card da usina mostra UCs alocadas, energia alocada, restante e média dos últimos 12 meses.
- Importação da conta de energia da usina para registrar produção a partir das leituras, com fator de multiplicação.
- Área de faturas com filtros de abertas, vencidas e pagas, download da conta da concessionária e da fatura unificada.
- Notificações persistem as leituras por usuário para não reaparecerem como não lidas.

### Consumidor

- Ao entrar, o usuário seleciona sua unidade consumidora cadastrada; ele não cria UCs pelo app.
- Abas visíveis: Home, Economia e Contrato. O menu de três linhas mantém Perfil e preferências, incluindo biometria.
- Home mostra faturas pendentes e permite abrir a fatura; Economia separa documentos da Andrade Energy e contas da concessionária.
- Contrato exibe status, termo de adesão, UCs, vigência, economia estimada e o cancelamento. Cancelamentos de contratos vencidos podem gerar a fatura de encerramento do saldo de compensação.
- Cabeçalhos, carregamento e ícones utilizam a identidade Andrade Energy; o app consumidor e o gerador têm variantes visuais distintas.

### Atualização de dados

Todas as abas suportam atualização por gesto de puxar a tela para baixo, com comportamento elástico:

- Consumidor: Home, Economia e Contrato.
- Gerador: Home, Clientes, Usinas, Operação, Faturas, Financeiro e Perfil.

As listas também se atualizam ao voltar à tela correspondente.

## Faturamento e regras de energia

- A importação de PDF usada para cadastro somente extrai dados e sugere campos; não deve gerar faturamento automaticamente.
- A fatura unificada preserva a conta da concessionária e calcula separadamente a cobrança de energia da usina, desconto e economia.
- Para **compensação**, a cobrança mensal é somente pela energia compensada lida nos campos `Energia Compensada GD1` ou `GD2`. O saldo de créditos é registrado e cobrado apenas no encerramento do contrato.
- Na ausência de energia compensada no PDF, considerar `0 kWh`.
- Para **injeção**, a alocação inicial é 100%, podendo ser ajustada; para compensação, a alocação é sugerida pela média de consumo dos últimos 12 meses e pode ser editada.

Os cálculos com faturas CEMIG, sobretudo GD1/GD2 e tarifas com imposto, ainda devem ser conferidos com PDFs reais antes de uso comercial amplo.

## Backend e infraestrutura

- API de produção configurada: `https://andrade-energy-api-vda.onrender.com/api`.
- Banco, autenticação e armazenamento de PDFs: Supabase.
- PDFs de faturas são armazenados no bucket privado `faturas`, com links temporários para download.
- E-mail: integração Brevo preparada. WhatsApp continua dependente de credenciais e modelo aprovado na Meta.
- EAS possui perfis separados `preview`, `preview-gerador`, `production` e `production-gerador`.

Uma alteração de ícone, pacote, permissão nativa ou versão requer novo build EAS. Alterações somente em JavaScript/TypeScript podem ser entregues por update OTA quando houver build compatível instalado.

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

No desenvolvimento em rede local, a API detecta o host do Expo. Para testar contra a API hospedada, usar `EXPO_PUBLIC_API_URL=https://andrade-energy-api-vda.onrender.com/api`.

## Validação recente

- TypeScript: `node_modules\\.bin\\tsc.cmd --noEmit --pretty false` passou sem erros.
- Lint das telas atualizadas passou sem erros.

## Próximos testes prioritários

1. Validar no celular o gesto de atualização e a navegação em cada variante.
2. Executar ponta a ponta o cadastro por PDF, alocação, faturamento, download e baixa de uma fatura real de teste.
3. Conferir com novas faturas CEMIG GD1/GD2 se todos os campos de energia compensada, saldo e tarifa foram lidos corretamente.
4. Implementar recebimento automático de contas por e-mail e concluir a integração do WhatsApp Cloud API.
5. Revisar autorização de todas as rotas do backend e políticas RLS antes da operação em produção.
