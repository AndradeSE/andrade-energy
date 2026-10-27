# Rateio — estado real do envio em 27/10/2026

## Modos
- Manual: CSV e abertura do portal. Usuário conclui anexação/protocolo.
- Autorizar e enviar: intenção aprovada pelo usuário, mas NÃO implementado para protocolo definitivo. Runner local validado apenas até revisão.
- Automático: NÃO implementado para protocolo definitivo. Não confundir com geração automática da planilha.

## Celular em segundo plano
Análise de viabilidade concluída, sem envio real. O app Expo54 atual não contém expo-background-task, expo-task-manager nem navegador WebView de automação. Abrir Chrome com Linking não controla a página. WorkManager permite trabalho adiado sujeito ao SO e não fornece um navegador/Activity controlável em segundo plano. Android restringe lançamentos de Activity em segundo plano. Não instalar acessibilidade ampla nem enfraquecer bloqueio do aparelho como atalho. Não prometer execução quando ligar o aparelho.

Fontes: https://raw.githubusercontent.com/expo/expo/sdk-54/docs/pages/versions/v54.0.0/sdk/background-task.mdx e https://developer.android.com/guide/components/activities/secure-bal

## Antes de habilitar protocolo
1. CSV real da competência completa, sem UCs fictícias; usuário pediu aguardar restante do faturamento.
2. Revalidar empresa/usina/competência, identidade do CSV e autorização por versão do arquivo.
3. Reserva única no servidor e estado de envio persistente. Resultado incerto deve bloquear repetição até reconciliação.
4. Executor local/nuvem precisa capturar protocolo real e confirmação. Nunca tratar clique ou timeout como sucesso.
5. Verificação humana pausa o fluxo. Não protocolar nos testes de simulação.

## Alterações concluídas em código
Checkbox mensal removido: validação estrutural de números, duplicidades e dados obrigatórios. Nenhum aceite humano é falsificado. A última âncora é persistida por usina na API, só aplicada após sucesso. UI distingue manual/autorizar/automático e mantém indisponíveis modos sem integração. Alertas Gmail identificam UC e finalidade. UI Gmail separa conectado/validando/reautorizar e atualiza em foco/retorno ao app.
