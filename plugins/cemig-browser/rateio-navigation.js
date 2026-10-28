/* Runs only in the official Cemig top frame. Never solves challenges or submits a protocol. */
(function (config) {
  function text(el) { return String(el.innerText || el.textContent || el.value || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { return !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'; }
  function result(state, message) { return JSON.stringify({state:state,message:message}); }
  if (!/^https:\/\/(atende|atendimento|www\.atendimento)\.cemig\.com\.br(?:\/|$)/.test(location.href)) return result('PAUSADO','Domínio fora do fluxo autorizado.');
  var body=text(document.body);
  if (/verify you are human|verifique se voce e humano|performing security verification/i.test(body)) return result('VERIFICACAO','Conclua a verificação de segurança nesta mesma sessão.');
  if (/\/Login\/?$/i.test(location.pathname) || document.querySelector('input[type=password]')) return result('LOGIN','Entre na Cemig. A continuação ocorrerá nesta mesma sessão.');
  if (!config.geradora || !/^\d{6,20}$/.test(config.geradora)) return result('PAUSADO','Confira a UC geradora no cadastro da usina.');
  if (!location.pathname.includes('compensation-gd')) {
    if (!config.iniciado) return result('PRONTO','Login confirmado. Toque em Continuar rateio para abrir o serviço.');
    location.assign('https://www.atendimento.cemig.com.br/portal/services/compensation-gd');
    return result('NAVEGANDO','Abrindo compensação de geração distribuída.');
  }
  var controls=Array.from(document.querySelectorAll('button,input[type=submit],a')).filter(visible);
  function clickUnique(label) {
    var found=controls.filter(function(el){return text(el).toLowerCase()===label.toLowerCase() && !el.disabled;});
    if(found.length!==1)return false;
    var key=location.href+'|'+label+'|'+body;
    if(window.__andradeLastStep===key)return false;
    window.__andradeLastStep=key;found[0].click();return true;
  }
  if (controls.some(function(el){return /^Solicitar cadastro$/i.test(text(el));})) return result('REVISAO','Revise a UC geradora e o CSV. Protocolo bloqueado no Preview.');
  if (!config.iniciado) return result('PRONTO','Toque em Continuar rateio para avançar até a revisão.');
  if (clickUnique('Realizar cadastro')) return result('CADASTRO','Abrindo seleção da UC geradora.');
  var selects=Array.from(document.querySelectorAll('select')).filter(visible);
  var ucSelect=selects.filter(function(s){return Array.from(s.options).some(function(o){return String(o.textContent).replace(/\D/g,'')===config.geradora;});});
  if(ucSelect.length===1){
    var select=ucSelect[0], options=Array.from(select.options).filter(function(o){return String(o.textContent).replace(/\D/g,'')===config.geradora;});
    if(options.length!==1)return result('PAUSADO','Mais de uma UC corresponde ao cadastro. Confira no portal.');
    if(select.value!==options[0].value){select.value=options[0].value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));return result('UC','UC geradora selecionada pelo cadastro.');}
    if(clickUnique('Avançar'))return result('MODALIDADE','UC confirmada. Abrindo modalidade.');
  }
  if (/selecione o tipo de modalidade/i.test(body)) {
    var mode=selects.filter(function(s){return Array.from(s.options).some(function(o){return text(o)==='Autoconsumo remoto';});});
    if(mode.length===1){var option=Array.from(mode[0].options).find(function(o){return text(o)==='Autoconsumo remoto';});if(mode[0].value!==option.value){mode[0].value=option.value;mode[0].dispatchEvent(new Event('change',{bubbles:true}));return result('MODALIDADE','Autoconsumo remoto selecionado.');}if(clickUnique('Avançar'))return result('ALOCACAO','Abrindo alocação de créditos.');}
    return result('PAUSADO','Confira a modalidade no portal e continue na mesma sessão.');
  }
  var files=Array.from(document.querySelectorAll('input[type=file]')).filter(function(el){return !el.disabled;});
  if(files.length===1)return result('ANEXO','Selecione o campo de anexo: será oferecido somente o CSV preparado.');
  return result('PAUSADO','Confira esta etapa do portal e toque em Continuar rateio. Nenhum protocolo foi enviado.');
})(__ANDRADE_CONFIG__);
