# Auditoria de segurança e criptografia — 09/10/2026

Revisão do aplicativo Android, API, Supabase de produção e homologação. O acesso público ao banco foi bloqueado e as senhas legadas foram protegidas nos dois ambientes. Correções publicadas na API e nos apps Gerador/Consumidor de produção e preview, inclusive nos APKs antigos de produção.

## Falhas comprovadas e correções

| Prioridade | Evidência e impacto | Correção |
| --- | --- | --- |
| Crítica | A chave publicável de produção retornava registros de usuários, clientes, faturas e contratos sem login. O catálogo também concedia escrita anônima em tabelas sem RLS. Não foram realizados testes de escrita anônima em dados reais. | RLS habilitado em todas as 49 tabelas de negócio; privilégios de tabelas, sequências e RPCs próprias removidos de PUBLIC/anon/authenticated. Backend conserva seus privilégios. Proteção aplicada em produção e preview. |
| Crítica | 10 contas em produção e 2 no preview ainda usavam o formato legado de senha sem Argon2. | Migração para Argon2id preservando cada senha atual. Atualização condicionada à senha anterior evita sobrescrever troca concorrente. Zero senhas legadas após a migração. |
| Alta | Recuperação de senha podia ser utilizada simultaneamente e incluía `ativo: true`, reativando contas desativadas ou pendentes. | Consumo exclusivo do link antes da gravação da senha; validade conferida novamente após o hash. Recuperação não altera ativação da conta. Se a escrita falhar depois do consumo, será necessário solicitar outro link. |
| Alta | `upsert` pelo número global de UC podia atualizar uma UC de outra empresa. Payloads de edição de usina/cliente permitiam trocar empresa/identificador, e vínculos externos podiam contornar o isolamento. | UC nova usa INSERT; UC existente usa UPDATE com identificador e empresa autenticada. Identidade/empresa removidas dos payloads. Usina vinculada a cliente e vínculos de criação de contrato conferidos na empresa da sessão. |
| Alta, caminho potencial | Enriquecimento de documento buscava uma URL gravada no banco por `fetch`, incluindo endereços internos caso o dado fosse adulterado. | URL legada só identifica objeto no bucket faturas do próprio Supabase; download pelo SDK privado. Hosts externos, HTTP e travessia de caminho são rejeitados. |
| Média | Tentativas financeiras simultâneas podiam ser descartadas pelo contador TOTP; uma gravação antiga também poderia limpar o bloqueio. | Compare-and-swap com releitura limitada, segredo/passo/bloqueio vinculados; cinco erros concorrentes bloqueiam o autenticador. |
| Média | Colaborador com perfil GESTOR podia alterar endereço do gerador pela rota de perfil. | Edição de endereço empresarial exige papel de titular na sessão e usa a empresa ativa autenticada. |
| Média | Sessão Android contendo token era persistida em AsyncStorage. | Migração para SecureStore; texto simples removido somente depois da gravação protegida. Falhas não rebaixam o armazenamento. Fila evita ressuscitar sessão em corrida com logout. |

O cadastro manual de UC que usava o SDK público foi movido para uma rota autenticada da API. Ela confere usina/cliente da empresa, ignora identidade/empresa/status enviados pelo cliente e não sobrescreve UC já cadastrada. Essa mudança acompanha a publicação do app e backend.

## Verificações executadas

- Supabase: 49 tabelas em cada ambiente; zero tabelas expostas no resumo do catálogo; zero RPCs próprias executáveis por anon/authenticated; buckets faturas/contratos privados; zero senhas legadas após migração.
- Produção: consultas anônimas a usuários/clientes/faturas/contratos/usinas/créditos/rateio/cobranças passaram a ser negadas. Preview: a chave publicável embutida já foi rejeitada; a proteção do banco foi confirmada adicionalmente pelo catálogo administrativo.
- Backend real: leitura com a configuração de serviço confirmou acesso aos cinco conjuntos verificados nos dois ambientes depois do bloqueio.
- Dados financeiros reais: produção tem uma chave Pix de gerador, uma comercial e um autenticador protegidos e decifráveis com a configuração vigente; preview tem uma chave Pix de gerador e dois autenticadores. Nenhuma chave Pix em texto simples foi encontrada em gerador_carteiras. Os valores nunca foram impressos.
- API externa: sete rotas privadas verificadas em cada ambiente retornaram 401 sem sessão. Origem CORS não autorizada não recebeu permissão de acesso; atualmente a API responde 500 para essa rejeição.
- Webhooks sem assinatura/token: produção negou Asaas/Mercado Pago com 401 e Resend com 400; preview negou Asaas e Mercado Pago com 401 e Resend com 400.
- 131 testes automatizados do backend passaram, incluindo concorrência de recuperação/TOTP, adulteração AES-GCM, SSRF e isolamento empresarial. Compilação TypeScript do backend aprovada.
- TypeScript do aplicativo e testes de migração segura, falha do cofre, corrupção, logout concorrente e isolamento preview aprovados. Exportações Android de Gerador e Consumidor concluídas; publicação reexporta os bundles finais.
- 122 arquivos exportados inspecionados contra 17 segredos da configuração de produção e 13 do preview: nenhum valor secreto encontrado. Busca estática no código rastreado não encontrou padrões de chave privada/secret key nos arquivos examinados. Isso não equivale a uma auditoria completa do histórico Git.
- Motor `backend/src/modules/billing/billing.engine.ts` sem alterações. Não foram criadas faturas, realizados pagamentos ou aceites de contrato durante a auditoria. Migrações alteraram permissões e hashes de senha, sem recalcular contas.

## Dependências

Backend: `npm audit --omit=dev` com zero alertas conhecidos. App: redução de 60 alertas (2 críticos, 39 altos, 19 moderados) para 46 (zero críticos, 26 altos, 20 moderados). Atualizações compatíveis de bibliotecas JavaScript e remoção do SDK Firebase JS sem uso; configuração nativa de FCM preservada. Versões dos módulos nativos, Expo 54 e React Native foram preservadas.

Os alertas restantes incluem dependências de construção/Metro/CLI e metadados propagados para Expo/React Native. Não foi demonstrado que todos são exploráveis no Android, mas também não foram descartados. `npm audit fix --force` propõe mudanças incompatíveis de SDK; não foi utilizado. A atualização planejada do SDK e revisão de alcançabilidade continuam necessárias.

## Riscos e limites que permanecem

1. **Exposição anterior:** proteger os hashes agora não desfaz eventual leitura passada de senhas/PII. Não há evidência suficiente para afirmar que houve ou que não houve invasão. Recomenda-se trocar as senhas das contas afetadas e revisar logs de acesso/atividade. Nenhum e-mail de recuperação foi enviado pela auditoria.
2. **Web:** SecureStore atende o aplicativo nativo. A sessão web continua em armazenamento acessível a JavaScript; migrar para cookies HttpOnly exige trabalho específico no portal/API e proteção CSRF.
3. **Assinatura das atualizações:** assinatura própria de código OTA não está configurada. Ativá-la exige planejamento de chaves e novo APK. A revisão não certificou MFA/permissões administrativas de Expo, Render, Supabase ou Azure.
4. **Política de autenticação:** mínimo atual de seis caracteres e bloqueio de login baseado em IP precisam de endurecimento de produto, inclusive proteção por conta e avaliação de MFA. Os testes não realizaram força bruta nem testes de carga contra produção.
5. **Chaves:** AES-256-GCM e Argon2id foram conferidos; nenhuma chave foi rotacionada. Produção utiliza o fallback da chave OAuth para dados financeiros. Separação de chaves, rotação e backups exigem migração versionada para preservar tokens/Pix/TOTP existentes.
6. **Cobertura:** auditoria de código, permissões reais, consultas controladas e testes automatizados; não é certificação nem pentest independente completo. O Samsung S23 conectou depois à depuração Wi-Fi e o Consumidor Preview apresentou a sessão autenticada de Vinícius. O APK não permite run-as (não debuggable): o conteúdo privado do cofre não foi extraído. A validação da migração de armazenamento se apoia nos testes automatizados; não se afirma inspeção direta do cofre no aparelho.

## Código e publicação

App: `ef92ca8` (segurança de sessão/dependências e UC pela API). Backend produção: `f0bcdee`; preview: `0a1fa9a`. Bancos já protegidos e senhas migradas nos dois ambientes. APIs online confirmadas por /health com os commits indicados. Seis grupos OTA publicados: preview Consumidor dbc606e3-3548-449f-be97-e75b8ea5b7c9; preview Gerador 58af7da9-6b39-48b1-848a-a83e97c7ba9d; produção Consumidor 7fe98538-9a1b-4ad3-9496-3956757f3a3a e Gerador 6f71d8a5-5fee-4f06-bc73-761fe689fab7 (runtime 1.0.4-production-live-awake); produção legada Consumidor 0820c796-033f-43b2-8b6c-bb4e6fa9de8c e Gerador ea84dd79-7019-4e74-98ee-6eb1aff207ee (runtime 1.0.0).

## Referências técnicas

- [Expo SDK 54 — SecureStore](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/)
- [Supabase — RLS e privilégios](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — papéis do PostgreSQL](https://supabase.com/docs/guides/database/postgres/roles)

Configurações privadas foram usadas somente localmente, sem incluí-las em commits, relatórios ou bundles; arquivos temporários privados foram removidos após a validação.
