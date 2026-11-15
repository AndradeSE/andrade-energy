# Exclusão de empresas parceiras

Implementação em `app/admin/empresas.tsx` e no painel Empresas da web. O botão Excluir empresa exige digitar o nome exato. A API exige administração Andrade, bloqueia a proprietária e o ambiente atualmente selecionado, compara novamente o nome e só altera um cadastro ainda não excluído.

A exclusão é lógica: grava `excluida_em`, desativa a empresa e a retira das listas. Não apaga usuários, documentos ou dados financeiros. A auditoria registra `EMPRESA_EXCLUIDA`. Cadastros apenas inativos continuam distintos de excluídos. Alterações comuns não reativam um registro excluído. O middleware bloqueia a operação em empresa desativada, mantendo disponíveis os endpoints de listagem e seleção de outro ambiente autorizado.

## Publicação

Ainda não publicada. Aplicar primeiro a migração `20261115024506_exclusao_logica_empresas_parceiras.sql`, depois publicar a API e só então as telas web/app. A migração adiciona uma coluna e duas restrições; não exclui registros existentes. Seguir a baseline de release mobile antes de qualquer OTA.

## Verificação local

- Cinco testes de exclusão aprovados: permissões, proprietária, ambiente atual, confirmação pelo nome, preservação do cadastro/auditoria e distinção entre inativa e excluída.
- 14 testes existentes de autenticação/permissões aprovados.
- TypeScript do app, API e web sem erros; build Vite da web concluído.
- Nenhuma exclusão executada em base real. A migração ainda não foi aplicada nem validada em banco de homologação; os testes de serviço usam dados controlados.
