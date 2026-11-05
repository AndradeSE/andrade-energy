(function (config) {
  if (window !== window.top ||
      !/^https:\/\/(www\.)?atendimento\.cemig\.com\.br$/.test(location.origin) ||
      location.pathname !== "/portal/services/inform-reading") return "FORA_DO_SERVICO";

  var dialogs = Array.from(document.querySelectorAll('[role="dialog"],dialog')).filter(function (el) {
    return el.getClientRects().length && /Confirmar leitura/i.test(el.innerText || "");
  });
  if (dialogs.length !== 1) return "CONFIRMACAO_NAO_IDENTIFICADA";
  var dialog = dialogs[0];
  var texto = dialog.innerText || "";
  if (!/Valor estimado/i.test(texto) || !/somente será aceita se a Cemig não realizar a leitura/i.test(texto)) {
    return "CONFIRMACAO_NAO_IDENTIFICADA";
  }
  var botoes = Array.from(dialog.querySelectorAll("button")).filter(function (el) {
    return el.getClientRects().length && !el.disabled && el.textContent.trim() === "Confirmar leitura";
  });
  if (botoes.length !== 1) return "CONFIRMACAO_NAO_IDENTIFICADA";
  // Recheck the actual form immediately before reservation and submission.
  // A user or the portal may have changed it after the preparation tick.
  var unidades = Array.from((document.body && document.body.innerText || "").matchAll(
    /voc[eê] est[aá] na unidade consumidora\s*n[º°o.:]*\s*([\d.-]+)/gi));
  var valores = Array.from(document.querySelectorAll('input[id^="03 - Leitura consumo"]'));
  var referencias = Array.from(document.querySelectorAll('input#referenceMonth'));
  if (unidades.length !== 1 || unidades[0][1].replace(/\D/g, "") !== config.uc ||
      valores.length !== 1 || valores[0].value !== config.leitura ||
      referencias.length !== 1 || referencias[0].value.trim().toLowerCase() !== config.referencia) {
    return "DADOS_ALTERADOS";
  }
  if (config.envioReservado !== true) return "AGUARDANDO_RESERVA";
  if (window.__andradeAutoleituraConfirmada) return "AGUARDANDO_RETORNO";
  window.__andradeAutoleituraConfirmada = true;
  botoes[0].click();
  return "AGUARDANDO_RETORNO";
})(__ANDRADE_CONFIG__);
