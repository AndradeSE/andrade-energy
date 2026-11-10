import assert from 'node:assert/strict';
import test from 'node:test';
import {mesmaCaixaGmailAutorizada,priorizarConexoesGmail,podeCompartilharCredencialGmailEmpresa} from './gmailConexao.policy';
const connection={usuario_id:'owner',empresa_id:'company',email_conectado:'mail@example.com'};
const valid={...connection,provedor:'GMAIL',status:'LEITURA_AUTORIZADA',regra_status:'ATIVA',regra_erro:null};
const uc={id:'uc1',tipo:'BENEFICIARIA',cliente_id:'client1',usinas:{titularidade_ucs_recebedoras:'GERADOR'}};

test('consentimento recém-renovado precede uma conexão antiga anteriormente ativa',()=>{
  assert.equal(priorizarConexoesGmail([{conectado_em:'2026-11-03',regra_status:'ATIVA'}, {conectado_em:'2026-11-10',regra_status:'NAO_APLICAVEL'}])[0].conectado_em,'2026-11-10');
});
test('somente o titular da operação pode reutilizar seu próprio consentimento da mesma empresa',()=>{
  assert.equal(podeCompartilharCredencialGmailEmpresa('ADMIN',true,'ADMIN_EMPRESA'),true);
  assert.equal(podeCompartilharCredencialGmailEmpresa('GESTOR',true,'GESTOR'),true);
  for(const [perfil,ativo,papel] of [['LEITURA',true,'CLIENTE'],['ADMIN',false,'ADMIN_EMPRESA'],['GESTOR',true,'COLABORADOR_GERADOR']])
    assert.equal(podeCompartilharCredencialGmailEmpresa(String(perfil),ativo===true,String(papel)),false);
});
test('a caixa compartilhada atende outras UCs do mesmo titular sem reutilizar autorizações de outra conta',()=>{
  assert.equal(mesmaCaixaGmailAutorizada(connection,uc,valid,{...uc,id:'uc2',cliente_id:'client2'}),true);
  for(const change of [{usuario_id:'other'},{empresa_id:'other'},{email_conectado:'other@example.com'},
    {status:'REVOGADA'},{regra_status:'ERRO'},{regra_erro:'expired'},{provedor:'OUTLOOK'}])
    assert.equal(mesmaCaixaGmailAutorizada(connection,uc,{...valid,...change},uc),false);
});
test('produção da geradora e UCs de titularidade de clientes mantêm escopos separados',()=>{
  assert.equal(mesmaCaixaGmailAutorizada(connection,uc,valid,{...uc,tipo:'GERADORA'}),false);
  const client={...uc,usinas:{titularidade_ucs_recebedoras:'CLIENTE'}};
  assert.equal(mesmaCaixaGmailAutorizada(connection,client,valid,{...client,id:'uc2'}),true);
  assert.equal(mesmaCaixaGmailAutorizada(connection,client,valid,{...client,cliente_id:'other'}),false);
  assert.equal(mesmaCaixaGmailAutorizada(connection,client,valid,uc),false);
});
