# Web: adaptações e validação — 04/10/2026

Implementado neste checkout:

- Nome e sobrenome separados no convite de gerador, no perfil e nos formulários de clientes.
- Endereço completo com CEP, rua, número, complemento, bairro, cidade e UF; consulta ViaCEP com proteção contra respostas atrasadas.
- Endereços estruturados na edição de cliente, usina e contrato e na preparação da minuta.
- Validação de CPF e nome completo no cadastro de cliente e convite de gerador; e-mail de cliente obrigatório.
- Envio da fatura no cadastro de cliente preservado.
- Perfil envia o tipo correto à API: LEITURA/Consumidor e Gerador, evitando editar endereço na entidade errada.
- Importação de produção por PDF usando a UC e o endpoint existente, com repetição para documento protegido.
- Tratamento de falhas de rede ao salvar perfil e editar registros.
- Chave Pix detectada automaticamente e olho para exibir/ocultar senha nas carteiras do gerador e comercial.
- Proxy somente de desenvolvimento para homologação. Produção não foi alterada.

Validação realizada:

- TypeScript da web e dos apps sem erros.
- Build da web concluído.
- Cinco testes de validação cadastral e Pix aprovados.
- Componentes no navegador: nomes separados, endereço completo e consulta real de CEP; campos preenchidos preservados.
- Consulta local à configuração de assinatura retornou disponível/pronto/ASAAS.

Não confundir o formulário local scripts/form-check.html com teste integrado: ele não cria registros.

Pendências antes de publicação da web:

- Login real do Gerador Preview na prévia local http://127.0.0.1:5184/ para validar criação/edição e minuta com registros de homologação.
- Teste integrado de assinatura: pagamento Sandbox confirmado -> convite entregue -> cadastro -> plano vinculado. Não concluído.
- Conferir as adaptações restantes de carteira/Pix, notificações e navegação com sessão autenticada.
- Publicação do portal público somente após validação, sem levar URL de homologação ao build público.

Preview Android publicado nesta rodada:

- Gerador: grupo 09db052a-7ec3-4de6-82e3-2b30a7a840c9, revisão r20261004.3.
- Consumidor: grupo 3c37ce63-9e88-419e-879f-075f5e190fff, revisão r20261004.3.
- Histórico corrigido para cada app; atalho do Gerador movido abaixo de Geração do mês; lista com o mesmo nome e aparência.

Estas correções não foram publicadas em produção nesta rodada.
