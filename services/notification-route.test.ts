import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationRoute} from './notification-route';
test('aviso antigo de produção abre operação; rateio continua rateio',()=>{
 const url='/operacao/rateio?competencia=2026-10&usinaId=usina1';
 assert.equal(notificationRoute(url,'PRODUCAO_IMPORTADA'),'/operacao?solarCompetencia=2026-10&usinaId=usina1');
 assert.equal(notificationRoute(url,'RATEIO_PRONTO'),url);
 assert.equal(notificationRoute('//externo'),undefined);
});
