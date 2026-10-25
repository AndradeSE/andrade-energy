import assert from 'node:assert/strict';
import test from 'node:test';
import {selecionarLiveCemig} from './cemigCloud.browserbase';

const live='https://www.browserbase.com/devtools/test';
test('redirecionamento escolhe a aba Cemig em vez da aba vazia da sessão',()=>{
 assert.equal(selecionarLiveCemig({pages:[{url:'about:blank',debuggerFullscreenUrl:'https://www.browserbase.com/blank'},
  {url:'https://atende.cemig.com.br/Login',debuggerFullscreenUrl:live}]},'https://www.atendimento.cemig.com.br/portal/services/compensation-gd'),live);
});
test('múltiplas abas exigem correspondência exata; não adivinha sessão de login',()=>{
 const pages=[{url:'https://atende.cemig.com.br/Login',debuggerFullscreenUrl:live},
  {url:'https://www.atendimento.cemig.com.br/portal/home',debuggerFullscreenUrl:live+'/home'}];
 assert.equal(selecionarLiveCemig({pages},pages[1].url),live+'/home');
 assert.throws(()=>selecionarLiveCemig({pages},'about:blank'));
});
test('ausência da aba e destinos parecidos ou com credenciais falham sem fallback',()=>{
 for(const url of ['about:blank','https://atende.cemig.com.br.evil.test/Login','https://u:p@atende.cemig.com.br/Login'])
  assert.throws(()=>selecionarLiveCemig({pages:[{url,debuggerFullscreenUrl:live}]},url));
 assert.throws(()=>selecionarLiveCemig({}));
 assert.throws(()=>selecionarLiveCemig({pages:[{url:'https://atende.cemig.com.br/Login',debuggerFullscreenUrl:'https://evil.test/'}]}));
});
