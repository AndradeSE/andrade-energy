-- Complementa a política sem reescrever versões já aceitas.
-- Não equivale a certificação CASA nem a aprovação OAuth pelo Google.
do $gmail_privacidade$
declare
  anterior record;
  complemento text := $texto$

9. Integração opcional com Gmail. A conexão é iniciada pelo usuário para importar contas de energia para as unidades consumidoras ou usinas que ele está autorizado a administrar. Solicitamos openid, email e profile para identificar a conta autorizada e gmail.readonly para consultar mensagens e baixar anexos. Essa permissão permite leitura no Gmail; o filtro de contas de energia é uma limitação da aplicação, não uma restrição da permissão concedida pelo Google. A integração não solicita permissão para enviar, alterar ou excluir mensagens do Gmail.

10. Dados acessados e finalidade. A integração consulta identificadores, remetente, destinatários, assunto, datas, estrutura e conteúdo das mensagens correspondentes à pesquisa de contas de energia e seus anexos PDF ou imagem. O conteúdo MIME pode conter o corpo da mensagem. A pesquisa de produção procura mensagens de fatura@cemig.com.br com anexos dentro da janela de datas de importação. O sistema extrai dados como titular, número da UC, endereço, competência, datas de leitura, consumo, geração, créditos, tarifas e valores para identificar a unidade, registrar a conta, atualizar a produção da usina ou preparar o faturamento conforme a configuração do usuário. Também são armazenados metadados de processamento e credenciais OAuth protegidas. Dados derivados, como históricos e indicadores, permanecem sujeitos às mesmas limitações de finalidade.

11. Acesso e prestadores. Dados importados ficam disponíveis aos usuários autorizados da empresa e da unidade, conforme seu perfil. Infraestrutura de hospedagem, banco de dados, armazenamento e cópias de segurança processa os dados necessários à operação; suporte e outros operadores somente podem acessar o necessário ao atendimento autorizado, à segurança ou ao cumprimento de obrigação aplicável. O uso desses prestadores pode envolver processamento fora do Brasil. Recursos adicionais de voz e assistente podem envolver provedores de transcrição, síntese de voz e IA quando acionados; essa utilização não autoriza o emprego dos dados Google para treinamento geral de modelos. Não comercializamos os dados da integração.

12. Proteção. O fluxo OAuth usa conexão HTTPS e a credencial de renovação persistida é criptografada com AES-256-GCM. A autorização de acesso às unidades é conferida no servidor. O usuário não precisa fornecer a senha do Gmail à Andrade Energy. A proteção não significa certificação externa nem elimina todos os riscos; comunique suspeitas de acesso indevido ao canal de privacidade.

13. Desconexão, retenção e eliminação. A conexão permanece armazenada enquanto habilitada para importação. Ao remover a conexão no aplicativo ou portal, a credencial local é removida e o sistema tenta revogar o acesso junto ao Google. Se a revogação externa falhar, o usuário é avisado e pode retirar o acesso nas configurações da Conta Google. A desconexão interrompe o uso da credencial, mas não apaga automaticamente contas de energia, dados extraídos, registros financeiros ou protocolos já importados. Esses registros são mantidos enquanto necessários à prestação do serviço, execução contratual, obrigações legais ou defesa de direitos. Pedidos de eliminação são analisados pelo responsável; serão informados os dados elimináveis e os que precisam ser preservados, com seu fundamento. Não há promessa de exclusão instantânea nem de prazo único para todas as classes de dados. Cópias de segurança podem conservar registros até sua substituição no ciclo de backup, sob as mesmas restrições de acesso e finalidade.

14. Uso limitado de dados Google e inteligência artificial. O uso de dados brutos ou derivados recebidos das APIs Google Workspace observará a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado (Limited Use). É vedado usar esses dados para publicidade direcionada, venda a intermediários de dados, avaliação de crédito ou desenvolvimento, melhoria ou treinamento de modelos gerais de IA/ML. Também é vedado transferi-los a um provedor que os utilize para esse treinamento. O processamento por operadores ou recursos de IA deve limitar-se às funcionalidades autorizadas pelo usuário e observar essas restrições. A autorização do Gmail não é autorização para treinamento de modelos. Esta declaração estabelece as regras de tratamento e não representa aprovação OAuth nem certificação CASA.

15. Canal de privacidade. Para acesso, correção, informação sobre compartilhamento, revogação ou análise de eliminação dos dados da integração, utilize o Perfil no aplicativo/portal ou escreva para andradeenergyltda@gmail.com. A identidade e a autorização sobre a unidade poderão ser conferidas antes do atendimento. A política pode ser consultada publicamente em https://www.andradeenergy.com.br/privacidade.
$texto$;
begin
  if exists (select 1 from public.documentos_comerciais where tipo='POLITICA_PRIVACIDADE' and versao='1.3-gmail') then
    return;
  end if;
  select titulo, conteudo into anterior
  from public.documentos_comerciais
  where tipo='POLITICA_PRIVACIDADE' and ativo=true and publicado_em is not null
  order by publicado_em desc limit 1;
  if not found then
    raise exception 'Política vigente não encontrada; publicação interrompida.';
  end if;
  update public.documentos_comerciais set ativo=false
  where tipo='POLITICA_PRIVACIDADE' and ativo=true;
  insert into public.documentos_comerciais(tipo,titulo,versao,conteudo,ativo,publicado_em)
  values ('POLITICA_PRIVACIDADE',anterior.titulo,'1.3-gmail',
    replace(anterior.conteudo,'contato@andradeenergy.com.br','andradeenergyltda@gmail.com') || complemento,true,now());
end;
$gmail_privacidade$;
