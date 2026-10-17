# Revisão de segurança e liberação — 17/10/2026

Escopo: revisão de código dos controles de sessão, escopo de empresa/UC, aceite contratual, faturamento, upload, armazenamento de segredos e assistente; execução de todos os testes disponíveis do backend; auditoria das dependências. Não equivale a pentest independente, teste de infraestrutura ou garantia de ausência de vulnerabilidades.

## Evidências

- Backend compilou; 176 testes passaram, incluindo AES-GCM (adulteração/chave incorreta), Argon2id, documentos privados/SSRF, OAuth, isolamento de empresas, autorização financeira e regressões de faturamento. Testes isolados usaram configuração fictícia.
- npm audit --omit=dev do backend: zero vulnerabilidades conhecidas.
- Mobile: auditoria inicial com 43 alertas (26 altos, 17 moderados). Atualização compatível de brace-expansion 1.1.15 para 1.1.21 no lockfile reduziu para 42 (25 altos, 17 moderados). Persistem alertas em dependências transitivas do Expo/React Native e ferramentas, inclusive node-forge/braces sem versão corrigida disponível na consulta. Não foi aplicado audit fix --force nem trocado o runtime nativo.
- Senhas novas usam Argon2id, tokens de sessão são aleatórios e persistidos por hash; app nativo usa SecureStore. Segredos OAuth e dados financeiros usam AES-256-GCM; alterações desta entrega não trocam as chaves existentes.
- Rotas contratuais exigem autenticação, operações geradoras exigem perfil e escopo de empresa; aceite verifica titular e vínculo ao contrato. Código de aceite expira em dez minutos, tem limite de tentativas e é vinculado ao hash do PDF/configuração.
- Reteste físico no S23: Gerador Preview gerou/enviou revisão R2 da UC 1204584501840 para Vinícius Duart Test. Consumidor Preview recebeu e o usuário concluiu o aceite em 17/10/2026. Não foi emitido boleto/fatura durante esse teste.

## Correções desta entrega

- Vencimento três dias antes da concessionária somente com contrato/revisão efetivamente aceito. Revisão pendente não muda o contrato anterior. Faturas já emitidas preservam o vencimento.
- Bloqueio de emissão com antecipação já passada e revisão de rascunho criado antes do novo aceite.
- Abertura de minuta recém-gerada usa o ID retornado pelo servidor, mantendo verificação de versão atual para impedir documento incorreto.
- Atualização compatível de brace-expansion no lockfile.
- Detectado armazenamento da sessão nativa no AsyncStorage: migrado para SecureStore em blocos pequenos, com gravação antes da exclusão do legado e serialização de migração/logout. Quatro testes adicionais passaram (migração, Unicode/tamanho, falha parcial e concorrência). A reabertura física de ambos os apps Preview preservou a autenticação.
- Gerador passa a apresentar a escolha inicial de área/usina após carregar sessão e navegação, em vez de entrar diretamente na última usina. Conferido no S23: área administrativa → Gestão de Usinas → lista "Escolha uma usina". O ajuste de navegação foi corrigido e validado no Preview antes da promoção.

## Limites e pendências

Não foi verificada emissão real de uma nova fatura após o aceite; o cálculo de datas foi validado nos testes. Não houve varredura intrusiva em produção, rotação de segredos, auditoria de infraestrutura/contas dos provedores, nem substituição dos APKs instalados. A remediação integral dos alertas mobile requer trabalho adicional de atualização/avaliação das dependências e, quando necessário, novos builds nativos. Publicar esta entrega não significa encerrar essas pendências.
