# Contratos — estado local em 07/09/2026

## Fluxo aprovado

Gerador cadastra cliente e UC, configura UC, salva rascunho, gera/revisa contrato e envia contrato + proposta + convite. Consumidor cria conta, analisa e assina antes de acessar a operação daquela UC. Uma nova UC pendente não deve bloquear outra já liberada. PDF externo exige conferência explícita do gerador.

## Implementado e validado localmente

- Modelo integral fornecido pelo usuário: 26 cláusulas / 8 páginas, campos variáveis por UC; prévia em `output/pdf/previa-contrato-modelo-completo.pdf` (verificação visual realizada na etapa anterior).
- Separação entre salvar rascunho, gerar/revisar e enviar contrato/convite.
- Cadastro de cliente sem convite imediato; reenviar no perfil encaminha à revisão do contrato da UC; endpoint antigo não envia convite sem os dois documentos preparados pelo serviço interno.
- Gate do consumidor e endpoint de acesso por UC. Seleção de unidade permanece acessível para trocar para uma UC liberada.
- Dashboard e listagem/detalhe de faturas respeitam acesso por UC. Listagens agregadas filtram UCs pendentes e fixam o cliente da sessão.
- Leitura de contrato/proposta exige vínculo do consumidor, não apenas mesma empresa.
- Upload externo não libera UC. Botão de conferência no Gerador registra responsável, data e SHA-256 do arquivo.
- Arquivos de contrato recebem caminhos únicos (UUID, sem overwrite). Rascunho alterado invalida minuta anterior.
- Código de assinatura vinculado ao hash dos bytes do PDF e à versão de dados; tentativas com comparação de versão e proteção contra gravação concorrente.
- Interface não oferece outra assinatura quando já existe assinatura registrada ou PDF em conferência.
- Portal web possui revisão do PDF, assinatura desenhada e confirmação por código enviado ao e-mail; o aceite antigo sem evidências foi removido.
- Na web, consumidor sem nenhuma UC liberada é direcionado ao contrato pendente. Uma UC assinada preserva o acesso mesmo quando outra estiver aguardando assinatura.
- A migração `20260907120000_convite_por_unidade.sql` foi aplicada no Supabase vinculado em 07/09/2026; cada convite passa a apontar para a UC exata.

## Testes executados

- `node backend/node_modules/typescript/bin/tsc -p backend/tsconfig.json`: passou.
- `node --test backend/tests/contratos-acesso.test.cjs backend/dist/modules/contratos/acessoContrato.policy.test.js backend/dist/modules/billing/billing.engine.test.js`: 23 testes passaram, sem alterar dados reais.
- Exportações Android finais de Gerador e Consumidor passaram em diretórios temporários, após todas as alterações do fluxo.
- Build de produção do portal web passou depois da inclusão da assinatura e do bloqueio inicial.
- `tsx --test` falhou por `uv_os_get_passwd ENOMEM`; alternativa executada com sucesso: compilar e usar `node --test` nos JS gerados.

## Pendências antes de publicar

1. Executar teste integrado com uma conta exclusivamente de homologação: criar cliente/UC, salvar, revisar, enviar, criar conta, assinar e conferir a liberação por UC. Não modificar cliente real para simulação.
2. Completar auditoria das demais rotas históricas do consumidor; os testes automatizados atuais cobrem contrato, dashboard e faturas.
3. Não afirmar equivalência jurídica garantida somente por hash, OTP e assinatura desenhada; submeter o modelo e o processo a revisão jurídica antes do uso definitivo.
4. Publicação do portal está bloqueada porque o projeto Sites `appgprj_6a8c66b15ba48191baad8777fd2d1eba` pertence a outra conta: a sessão atual retorna `Sites project not found` e o remoto exige a credencial dessa conta.

## Publicação de 07/09/2026

- Commit principal/backend: `11ebb5a`; confirmado em produção pelo `/health` do Render.
- Supabase: migração `20260907120000_convite_por_unidade.sql` aplicada com sucesso.
- OTA Gerador `preview-gerador`: grupo `b607dfa6-c18e-47fe-be0a-9511e4ff729b`, Android `01a07a12-ba34-7011-9d96-66d2f8caa95d`.
- OTA Consumidor `preview-consumidor`: grupo `509314c4-b741-42fe-ad99-277e35418607`, Android `01a07a14-bf8a-75e6-9bfb-219c9ea96003`.
- Portal web: commit local validado `5dcc787`; publicação pendente de autenticação na conta proprietária do Sites.

Preservar arquivos não relacionados: `.worktrees`, `backend/tmp`, `backend/output`, `dist-*` e outros artefatos locais não devem entrar no commit por `git add .`.
