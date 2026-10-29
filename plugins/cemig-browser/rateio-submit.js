/* Production only. The caller must reserve ENVIANDO atomically before allowing one click. */
(function(config){
 function result(state,protocolo){return JSON.stringify({state:state,protocolo:protocolo||null});}
 function text(el){return String(el.innerText||el.textContent||el.value||'').replace(/\s+/g,' ').trim();}
 function visible(el){return !!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';}
 if(config.preview!==false||!/^https:\/\/(?:www\.)?atendimento\.cemig\.com\.br(?::443)?\/portal\/services\/compensation-gd(?:[/?#]|$)/i.test(location.href)||!document.body)return result('BLOQUEADO');
 var body=text(document.body);
 // A draft protocol displayed before submission is not a receipt.
 if(/(?:solicita[çc][aã]o|cadastro) (?:realizad[ao]|enviad[ao]|registrad[ao]) com sucesso/i.test(body)){
  var matches=Array.from(body.matchAll(/(?:n[úu]mero\s+(?:do\s+)?protocolo|n[º°]\s*(?:do\s+)?protocolo|protocolo)\s*[:#-]?\s*(\d{6,30})\b/gi));
  var ids=Array.from(new Set(matches.map(function(m){return m[1];})));
  return ids.length===1?result('PROTOCOLADO',ids[0]):result('INCERTO');
 }
 if(config.enviar!==true)return result('AGUARDANDO_PROTOCOLO');
 if(window.__andradeProtocolAttempted)return result('AGUARDANDO_PROTOCOLO');
 if(!config.arquivo||!body.includes(config.arquivo)||/template inv[aá]lido|arquivo inv[aá]lido|arquivo rejeitado/i.test(body))return result('BLOQUEADO');
 var buttons=Array.from(document.querySelectorAll('button,input[type=submit]')).filter(visible).filter(function(b){return /^Solicitar cadastro$/i.test(text(b));});
 var checks=Array.from(document.querySelectorAll('input[type=checkbox]')).filter(function(c){return visible(c)&&c.parentElement&&/Declaro que sou respons[aá]vel pela veracidade das informa[çc][oõ]es prestadas/i.test(text(c.parentElement));});
 if(buttons.length!==1||checks.length!==1||checks[0].disabled)return result('BLOQUEADO');
 if(!checks[0].checked){checks[0].click();return result('DECLARACAO_MARCADA');}
 if(buttons[0].disabled)return result('BLOQUEADO');
 window.__andradeProtocolAttempted=true;
 buttons[0].click();return result('ENVIANDO');
})(__ANDRADE_SUBMIT__);
