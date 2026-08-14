# Andrade Energy — continuidade do projeto

## Estado atual

Aplicativo Expo SDK 54 com backend Node/Express e Supabase. A experiência do perfil
LEITURA foi modernizada com referência visual Wattio, preservando a lógica existente
e reutilizando `components/ui`.

Telas evoluídas: Home, Economia, Faturas, detalhe da fatura, Contrato e Perfil.
Os destaques visuais reutilizam `assets/images/background.png`.

## Faturamento

O cadastro do cliente contém modalidade `INJECAO` ou `COMPENSACAO` e desconto
contratado. O processamento gera memória de cálculo com cobrança CEMIG, cobrança da
usina, total unificado, economia real e desconto final real considerando impostos e
encargos.

As migrações em `supabase/migrations` já foram aplicadas no projeto Supabase:

- `20260814180000_faturamento_cliente_unificado.sql`
- `20260814193000_storage_faturas_privadas.sql`
- `20260814203000_fila_notificacoes_fatura.sql`

## Documentos e notificações

Ao importar uma conta CEMIG, o backend guarda o original no bucket privado `faturas`,
gera o PDF da usina e o PDF unificado e fornece links temporários de download.

A fila `notificacoes_fatura` prepara os envios por e-mail e WhatsApp, evita duplicidade
e repete falhas. O e-mail está integrado à Brevo e foi validado com um envio real para
o próprio remetente. A integração do WhatsApp ainda depende das credenciais e de um
modelo aprovado na Meta.

## Configuração local obrigatória

O arquivo `backend/.env` nunca vai para o Git. Em cada computador, copiar
`backend/.env.example` para `backend/.env` e preencher localmente as chaves do
Supabase e da Brevo. Transferir segredos somente por um meio privado.

Depois de clonar ou atualizar:

```powershell
npm.cmd ci
cd backend
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Para iniciar o app em outro terminal, na raiz:

```powershell
npx.cmd expo start --lan
```

A API do app detecta o IP do host do Expo. Também pode ser definida explicitamente
com `EXPO_PUBLIC_API_URL`.

## Pendências prioritárias

1. Executar um teste completo com cliente de teste: importar CEMIG, calcular, gerar os
   três PDFs e entregar o e-mail.
2. Implementar recebimento automático das faturas enviadas pela concessionária. A
   solução robusta requer caixa de entrada própria/domínio ou provedor de inbound.
3. Conectar WhatsApp Cloud API e aprovar o modelo `fatura_disponivel`.
4. Adicionar autenticação/autorização às rotas do backend antes da produção.

## Segurança

Nunca versionar `.env`, chaves Supabase, Brevo, Meta ou caches de autenticação. O PDF
do contrato sem assinaturas está versionado em `output/pdf` por decisão explícita do
proprietário do projeto.
