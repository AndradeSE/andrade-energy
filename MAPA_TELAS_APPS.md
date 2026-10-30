# Mapa das telas dos aplicativos

Inventário estático de 51 rotas (layouts e pastas antigas excluídos). Ambos os APKs compartilham estas fontes. Linhas candidatas indicam títulos/instruções fora de Card/Section; Views estilizadas podem já formar cards. Não equivale a validação visual no aparelho.

| Tela | Textos | Linhas para revisão visual |
| --- | ---: | --- |
| app/(auth)/criar-conta.tsx | 15 | 85, 86, 105, 106 |
| app/(auth)/esqueci-senha.tsx | 6 | 36, 37 |
| app/(auth)/login.tsx | 17 | 104, 105 |
| app/(auth)/verificar-email.tsx | 4 | 44, 45 |
| app/(tabs)/clientes.tsx | 10 | 69, 69 |
| app/(tabs)/contrato.tsx | 33 | 316, 317, 344, 369, 393, 438 |
| app/(tabs)/economia.tsx | 24 | 115, 167, 220, 230 |
| app/(tabs)/faturas.tsx | 14 | 120, 120 |
| app/(tabs)/financeiro.tsx | 13 | — |
| app/(tabs)/index.tsx | 0 | — |
| app/(tabs)/operacao.tsx | 19 | — |
| app/(tabs)/perfil.tsx | 33 | 279, 280, 286, 298, 317, 342, 377 |
| app/(tabs)/usinas.tsx | 16 | — |
| app/admin/comercial.tsx | 27 | 272, 273 |
| app/admin/empresas.tsx | 21 | 52 |
| app/admin/escolher-area.tsx | 8 | 22, 22 |
| app/admin/perfil.tsx | 0 | — |
| app/assinatura/index.tsx | 21 | 112 |
| app/biometric-lock.tsx | 4 | 167, 175 |
| app/clientes/convidar.tsx | 5 | 50, 50, 55 |
| app/clientes/editar.tsx | 5 | 37, 37 |
| app/clientes/faturas-anexadas.tsx | 10 | 141, 141, 141 |
| app/clientes/novo.tsx | 5 | 70, 71 |
| app/clientes/[id].tsx | 26 | 162, 162 |
| app/contas-de-luz.tsx | 4 | 57, 57 |
| app/contratos/index.tsx | 4 | — |
| app/email-conectado.tsx | 1 | — |
| app/faturamento/criar-manual.tsx | 2 | 36, 36 |
| app/faturamento/manual.tsx | 8 | 77, 77 |
| app/faturas/confirmar.tsx | 4 | — |
| app/faturas/pagamento.tsx | 9 | 20, 21, 25, 31 |
| app/faturas/[id].tsx | 45 | 285, 425, 437, 456 |
| app/geradores/convidar.tsx | 8 | 20, 20 |
| app/geradores/gestao.tsx | 71 | 99, 100, 359, 392, 477, 560, 597, 649 |
| app/geradores/monitoramento.tsx | 36 | — |
| app/geradores/[id].tsx | 14 | 45, 52, 52 |
| app/modal.tsx | 0 | — |
| app/operacao/novo.tsx | 5 | 55, 55 |
| app/operacao/[id].tsx | 9 | 36, 36 |
| app/pesquisa.tsx | 5 | 53 |
| app/selecionar-unidade.tsx | 28 | 371 |
| app/tutoriais.tsx | 5 | 84, 85, 103 |
| app/unidades/contrato.tsx | 14 | 312, 313, 324, 338 |
| app/unidades/editar.tsx | 10 | 242, 247 |
| app/unidades/index.tsx | 7 | 45, 45 |
| app/unidades/nova.tsx | 13 | 251, 252 |
| app/unidades/recebimento-email.tsx | 31 | 312, 312, 326, 381 |
| app/unidades/[id].tsx | 14 | — |
| app/usinas/editar.tsx | 5 | 104, 104 |
| app/usinas/nova.tsx | 5 | 109, 110 |
| app/usinas/[id].tsx | 5 | 45, 45 |

## Ajustes desta revisão

- Section compartilhada: fundo, borda e espaçamento para agrupar título e conteúdo nas telas consumidoras.
- Operação: título da lista dentro de card.
- Contratos: introdução da lista dentro de card.
- Economia: introdução e títulos de seção com superfície delimitada.
- Tutoriais: introdução e orientação final em blocos delimitados.
- Usinas: apresentação do parque gerador dentro de card.

## Limites e continuidade

As linhas acima são candidatas automáticas, não defeitos confirmados. Autenticação, formulários e cabeçalhos podem ter textos adequadamente posicionados em Views estilizadas. Não foram alterados cálculos, dados, navegação ou regras de contrato. Ainda é necessária revisão visual no aparelho, incluindo fontes ampliadas e telas pequenas, antes de considerar o acabamento completo.

