import test from 'node:test';
import assert from 'node:assert/strict';
import { unidadesParaRecebimento } from './unidadesRecebimento';

test('UC recém-cadastrada pendente não substitui a configuração ativa do Gmail', () => {
 const pendente={id:'nova',status:'PENDENTE_CONTRATO',usina_id:'u1'};
 const ativa={id:'conectada',status:'ATIVA',usina_id:'u1',recebimento_email_ativo:true};
 const outra={id:'outra',status:'ATIVA',usina_id:'u2'};
 const lista=[pendente,outra,ativa];
 assert.deepEqual(unidadesParaRecebimento(lista,'u1'),[ativa]);
 assert.deepEqual(lista,[pendente,outra,ativa]);
 assert.deepEqual(unidadesParaRecebimento([pendente],'u1'),[]);
});

test('referência geral preserva titularidade e prioriza recebimento já configurado', () => {
 const livre={id:'livre',status:'ATIVA'};
 const configurada={id:'configurada',status:'ATIVA',recebimento_email_ativo:true};
 assert.deepEqual(unidadesParaRecebimento([livre,{id:'geradora',tipo:'GERADORA',status:'ATIVA'},
  {id:'cliente',status:'ATIVA',usinas:{titularidade_ucs_recebedoras:'CLIENTE'}},configurada]),[configurada,livre]);
});
