-- Minutas operacionais exibidas antes do checkout da assinatura.
-- A identificação fiscal completa do fornecedor deve também constar na cobrança.
update public.documentos_comerciais
set ativo = false
where tipo in ('TERMOS_USO', 'POLITICA_PRIVACIDADE', 'POLITICA_CANCELAMENTO');

insert into public.documentos_comerciais
  (tipo, titulo, versao, conteudo, ativo, publicado_em)
values
(
  'TERMOS_USO',
  'Termos de Uso e Assinatura da Plataforma Andrade Energy',
  '1.1',
  $termos$
1. Objeto. A Andrade Energy fornece ao assinante uma licença limitada, pessoal, revogável e não exclusiva de acesso à plataforma de gestão de geração compartilhada, conforme os recursos e limites do plano escolhido.

2. Cadastro e segurança. O assinante declara que os dados informados são verdadeiros, deve manter suas credenciais sob sigilo e responde pelas ações realizadas em sua conta e nas contas de colaboradores autorizados. Suspeitas de uso indevido devem ser comunicadas ao suporte.

3. Plano e cobrança. Nome do plano, ciclo, preço, vencimento e forma de pagamento são apresentados antes da contratação e na área Minha assinatura. A recorrência somente é ativada após este aceite e a conclusão do checkout do provedor de pagamento. Tributos e comprovantes seguem a legislação aplicável.

4. Renovação e alterações. Planos recorrentes renovam-se pelo ciclo contratado até o cancelamento. Mudanças de preço ou condições materiais serão informadas previamente pelos canais cadastrados, respeitando direitos legais e o prazo informado na comunicação.

5. Uso permitido. É proibido usar a plataforma para fraude, violação de direitos, acesso não autorizado, interferência técnica, engenharia reversa indevida ou envio de conteúdo ilícito. Dados de usinas, clientes, faturas e contratos devem possuir origem legítima e autorização adequada.

6. Disponibilidade. A plataforma pode passar por manutenção, atualização ou indisponibilidade causada por terceiros, internet, distribuidoras ou força maior. A Andrade Energy adotará medidas razoáveis para continuidade e segurança, sem garantir funcionamento ininterrupto.

7. Responsabilidades. A plataforma auxilia a gestão, mas decisões comerciais, fiscais, regulatórias e contratuais permanecem sob responsabilidade do assinante. Informações extraídas automaticamente de documentos devem ser conferidas antes do uso.

8. Propriedade intelectual. Software, marca, interfaces e materiais da Andrade Energy permanecem protegidos. O assinante mantém a titularidade dos dados legítimos inseridos e autoriza seu processamento para execução do serviço.

9. Suspensão e término. Inadimplência, risco de segurança ou violação destes termos pode causar restrição ou suspensão, com comunicação quando cabível. O encerramento não elimina obrigações vencidas nem registros sujeitos a guarda legal.

10. Atendimento e legislação. Solicitações podem ser feitas pelo canal contato@andradeenergy.com.br. Aplicam-se as leis brasileiras e os direitos obrigatórios do consumidor quando pertinentes.
  $termos$,
  true,
  now()
),
(
  'POLITICA_PRIVACIDADE',
  'Política de Privacidade da Plataforma Andrade Energy',
  '1.1',
  $privacidade$
1. Escopo. Esta política explica o tratamento de dados pessoais realizado pela Andrade Energy na criação da conta, operação da plataforma, suporte, segurança e cobrança da assinatura.

2. Dados tratados. Podemos tratar identificação e contato, CPF ou CNPJ, credenciais protegidas, dados de usinas e unidades consumidoras, faturas, contratos, registros financeiros, informações de colaboradores, endereço IP, dispositivo, data, hora e histórico de ações.

3. Finalidades e bases legais. Os dados são usados para executar contratos e solicitações, autenticar usuários, prevenir fraude, prestar suporte, processar pagamentos, cumprir obrigações legais e regulatórias e exercer direitos. Quando a lei exigir consentimento específico, ele será solicitado separadamente e poderá ser revogado sem afetar tratamentos anteriores legítimos.

4. Compartilhamento. Os dados podem ser compartilhados, no limite necessário, com infraestrutura de nuvem, autenticação, comunicação, análise de documentos e provedores de pagamento, além de autoridades quando houver obrigação legal. Não comercializamos dados pessoais.

5. Segurança e retenção. São aplicadas medidas técnicas e administrativas compatíveis com os riscos. Os dados são mantidos pelo período necessário ao serviço e aos prazos legais, contratuais, fiscais, de segurança e defesa de direitos; depois são eliminados ou anonimizados quando aplicável.

6. Direitos do titular. O titular pode solicitar confirmação, acesso, correção, informação sobre compartilhamento e, quando cabível, anonimização, portabilidade, oposição ou eliminação. A identidade poderá ser validada antes do atendimento.

7. Decisões e extração automatizada. Recursos automáticos podem auxiliar a leitura de faturas e documentos. O usuário deve conferir os resultados, podendo solicitar correção pelos canais de atendimento.

8. Contato e atualizações. Solicitações de privacidade podem ser enviadas a contato@andradeenergy.com.br. Alterações materiais desta política serão comunicadas e uma nova versão poderá exigir novo aceite.
  $privacidade$,
  true,
  now()
),
(
  'POLITICA_CANCELAMENTO',
  'Política de Cancelamento da Assinatura Andrade Energy',
  '1.1',
  $cancelamento$
1. Solicitação. O titular pode solicitar o cancelamento da assinatura pelos canais disponibilizados em Minha assinatura ou pelo e-mail contato@andradeenergy.com.br, após validação de identidade.

2. Efeito. O cancelamento impede novas renovações após o ciclo já contratado. O acesso permanece até o fim do período pago, salvo violação dos termos, risco de segurança, obrigação legal ou condição diferente claramente informada antes da contratação.

3. Cobranças. Valores vencidos e serviços já prestados continuam devidos. Eventual estorno, reembolso ou direito de arrependimento será analisado conforme a forma de contratação, a data da solicitação e a legislação aplicável.

4. Plano anual parcelado. O parcelamento é forma de pagamento do ciclo anual e não transforma a contratação em mensal. As condições apresentadas antes do checkout e os direitos legais aplicáveis serão respeitados.

5. Dados após o cancelamento. O encerramento do acesso não implica eliminação imediata de documentos e registros fiscais, financeiros, contratuais, de auditoria e segurança sujeitos a retenção. Solicitações de privacidade seguem a Política de Privacidade.

6. Confirmação. A Andrade Energy enviará ou exibirá a confirmação do cancelamento. Se não a receber, o assinante deve contatar o suporte antes do próximo vencimento.
  $cancelamento$,
  true,
  now()
)
on conflict (tipo, versao) do update set
  titulo = excluded.titulo,
  conteudo = excluded.conteudo,
  ativo = true,
  publicado_em = excluded.publicado_em;
