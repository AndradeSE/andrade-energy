import assert from 'node:assert/strict';
import test from 'node:test';
import {motivoBloqueioCaptcha,CAPTCHA_MINIMUM_REMAINING_MS} from './cemigCloud.captchaPolicy';
const agora=Date.parse('2026-10-25T12:00:00Z');
const input={disponivel:true,estado:'AGUARDANDO_LOGIN',captchaEstado:'NAO_SOLICITADO',expiraEm:new Date(agora+CAPTCHA_MINIMUM_REMAINING_MS).toISOString()};
test('aceita exatamente a janela mínima e recusa antes de criar tarefa quando expira',()=>{
 assert.equal(motivoBloqueioCaptcha(input,agora),null);
 assert.match(motivoBloqueioCaptcha(input,agora+1)!,/menos de três minutos/);
 assert.match(motivoBloqueioCaptcha({...input,expiraEm:'inválida'},agora)!,/não consumiu crédito/);
});
test('estado, configuração e tarefa anterior impedem nova resolução',()=>{
 assert.match(motivoBloqueioCaptcha({...input,disponivel:false},agora)!,/ambiente/);
 assert.match(motivoBloqueioCaptcha({...input,estado:'CANCELADO'},agora)!,/aguardando/);
 for(const captchaEstado of ['FILA','RESOLVENDO','RESPOSTA_APLICADA','ERRO'])assert.match(motivoBloqueioCaptcha({...input,captchaEstado},agora)!,/Não repita/);
});
