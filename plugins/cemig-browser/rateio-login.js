// Adapted from the validated cemigLogin.ts modal scopes. No CAPTCHA solving here.
(function(access){
 function visible(el){return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
 if(location.protocol!=='https:'||(location.port&&location.port!=='443')||!['atende.cemig.com.br','www.atende.cemig.com.br'].includes(location.hostname)||!/^\/Login\/?$/i.test(location.pathname))return 'FORA_LOGIN';
 if(/Verify you are human|Performing security verification/i.test(document.body.innerText))return 'VERIFICACAO';
 if(/(?:verifica[çc][aã]o|verification).*(?:expir|expired)/i.test(document.body.innerText))return 'VERIFICACAO_EXPIRADA';
 function same(a,b){return a===b||(a.includes('@')&&b.includes('@')&&a.toLowerCase()===b.toLowerCase())||(/^\d[\d.\/-]+$/.test(a)&&/^\d[\d.\/-]+$/.test(b)&&a.replace(/\D/g,'')===b.replace(/\D/g,''));}
 function fill(el,value){if(el.value===value)return;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
 var modal=document.querySelector('#modalLoginComSenha');
 if(!visible(modal)){
  var user=document.querySelector('#acesso'),open=document.querySelector('#btnEntrarComSenha');
  if(!visible(user)||!visible(open)||user.disabled||open.disabled)return 'FORMULARIO';
  if(!same(user.value,access.login))fill(user,access.login);
  if(!window.__andradeNativeOpenLogin){window.__andradeNativeOpenLogin=true;open.click();}
  return 'ABRINDO_SENHA';
 }
 var user=modal.querySelector('#acessoModalSenhaValor'),password=modal.querySelector('#senhaModal'),submit=modal.querySelector('#btnConfirmarLoginComSenha');
 if(!visible(user)||!visible(password)||!visible(submit)||!same(user.value,access.login))return 'FORMULARIO';
 fill(password,access.senha);
 var token=modal.querySelector('textarea[name="g-recaptcha-response"]')||document.querySelector('textarea[name="g-recaptcha-response"]');
 if(!token||token.value.length<20)return 'CAPTCHA';
 if(!window.__andradeNativeLoginSent&&!submit.disabled){window.__andradeNativeLoginSent=true;submit.click();return 'LOGIN_ENVIADO';}
 return 'AGUARDANDO_LOGIN';
})(__ANDRADE_ACCESS__);
