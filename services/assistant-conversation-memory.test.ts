import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationMemory } from './assistant-conversation-memory';
test('mantém correções além dos quatro turnos sem vazar dados privados',()=>{
 const turns=Array.from({length:20},(_,i)=>({from:i%2?'assistant' as const:'user' as const,text:i===0?'A âncora já está definida; não a altere.':`Etapa ${i}`}));
 const history=conversationMemory([...turns,{from:'assistant',text:'senha privada',private:true}],'online');
 assert.equal(history.length,20); assert.match(history[0].text,/não a altere/); assert(!history.some(t=>t.private));
});
test('limita memória em caracteres e preserva a ordem dos turnos mais recentes',()=>{
 const turns=Array.from({length:60},(_,i)=>({from:'user' as const,text:`${i}:`+'x'.repeat(4000)}));
 const history=conversationMemory(turns,'online');
 assert(history.length<=24);assert(history.reduce((n,t)=>n+t.text.length,0)<=24000);assert.match(history.at(-1)!.text,/^59:/);
});
test('memória privada local não é reaproveitada ao trocar para online',()=>{
 const turns=[{from:'user' as const,text:'pergunta'},{from:'assistant' as const,text:'resposta local',private:true}];
 assert.equal(conversationMemory(turns,'local').length,2);assert.equal(conversationMemory(turns,'online').length,1);
});
