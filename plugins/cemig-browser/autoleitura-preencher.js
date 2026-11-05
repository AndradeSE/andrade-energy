/* Prepares only the reading field. Advancing and submitting require separate steps. */
(function (config) {
  function digits(value) { return String(value || "").replace(/\D/g, ""); }
  function visible(element) { return element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible"; }
  function only(selector) {
    var elements = Array.from(document.querySelectorAll(selector)).filter(visible);
    return elements.length === 1 ? elements[0] : null;
  }
  if (window !== window.top ||
      !/^https:\/\/(www\.)?atendimento\.cemig\.com\.br$/.test(location.origin) ||
      location.pathname !== "/portal/services/inform-reading") return "FORA_DO_SERVICO";
  if (!/^\d{6,20}$/.test(config.uc) || !/^\d{1,9}$/.test(config.leitura) ||
      !/^\d{2}\/\d{2}\/\d{4}$/.test(config.dataLocal)) return "DADOS_INVALIDOS";

  var body = document.body && document.body.innerText || "";
  var unidades = Array.from(body.matchAll(/voc[eê] est[aá] na unidade consumidora\s*n[º°o.:]*\s*([\d.-]+)/gi));
  if (unidades.length !== 1 || digits(unidades[0][1]) !== config.uc) return "UC_NAO_CONFIRMADA";

  var botoes = Array.from(document.querySelectorAll("button")).filter(function (botao) {
    return visible(botao) && !botao.disabled &&
      botao.textContent.trim().replace(/\s+/g, " ") === "Informar leitura atual";
  });
  if (botoes.length === 1 && !only("input#referenceMonth") && !window.__andradeAbrindoLeitura) {
    window.__andradeAbrindoLeitura = true;
    botoes[0].click();
    return "ABRINDO_FORMULARIO";
  }

  var referencia = only("input#referenceMonth");
  var periodo = only("input#period");
  var ultima = only("input#lastReading");
  var leitura = only('input[id^="03 - Leitura consumo"]');
  if (!referencia || !periodo || !ultima || !leitura || leitura.disabled || leitura.readOnly) return "FORMULARIO_NAO_CONFIRMADO";
  if (referencia.value.trim().toLowerCase() !== config.referencia) return "REFERENCIA_DIVERGENTE";

  var janela = periodo.value.trim().match(/^(\d{2})\/(\d{2})\s+a\s+(\d{2})\/(\d{2})$/i);
  if (!janela) return "PERIODO_NAO_CONFIRMADO";
  var inicio = Number(janela[2] + janela[1]);
  var fim = Number(janela[4] + janela[3]);
  var hoje = Number(config.dataLocal.slice(3, 5) + config.dataLocal.slice(0, 2));
  var partesHoje = config.dataLocal.split("/");
  var anoHoje = Number(partesHoje[2]);
  var mesHoje = Number(partesHoje[1]);
  var diaHoje = Number(partesHoje[0]);
  var hojeUtc = Date.UTC(anoHoje, mesHoje - 1, diaHoje);
  var dataHoje = new Date(hojeUtc);
  if (dataHoje.getUTCDate() !== diaHoje || dataHoje.getUTCMonth() !== mesHoje - 1) return "DADOS_INVALIDOS";

  var anoReferencia = Number(referencia.value.trim().split("/").pop());
  if (!Number.isInteger(anoReferencia) || anoReferencia < 2000 || anoReferencia > 9999) return "REFERENCIA_DIVERGENTE";
  function dataPortal(ano, dia, mes) {
    var data = new Date(Date.UTC(ano, Number(mes) - 1, Number(dia)));
    return data.getUTCDate() === Number(dia) && data.getUTCMonth() === Number(mes) - 1
      ? data.getTime() : NaN;
  }
  var inicioUtc = dataPortal(anoReferencia - (inicio > fim ? 1 : 0), janela[1], janela[2]);
  var fimUtc = dataPortal(anoReferencia, janela[3], janela[4]);
  if (!Number.isFinite(inicioUtc) || !Number.isFinite(fimUtc) ||
      fimUtc - inicioUtc > 31 * 86400000 || hojeUtc < inicioUtc || hojeUtc > fimUtc) return "FORA_DO_PERIODO";

  var leituraAnterior = ultima.value.trim();
  if (leituraAnterior !== "-" &&
      (!/^\d{1,9}$/.test(leituraAnterior) || Number(config.leitura) < Number(leituraAnterior))) {
    return "LEITURA_REQUER_REVISAO";
  }
  if (leitura.value && leitura.value !== config.leitura) return "CAMPO_JA_PREENCHIDO";
  if (config.somenteConferencia && !window.__andradeBloqueioAutoleitura) {
    window.__andradeBloqueioAutoleitura = true;
    document.addEventListener("click", function (event) {
      var botao = event.target.closest && event.target.closest("button,input[type=submit]");
      var rotulo = botao && (botao.innerText || botao.value || "").trim();
      if (rotulo === "Avançar") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(leitura, config.leitura);
  leitura.dispatchEvent(new Event("input", { bubbles: true }));
  leitura.dispatchEvent(new Event("change", { bubbles: true }));
  if (leitura.value !== config.leitura) return "PREENCHIMENTO_NAO_CONFIRMADO";
  if (config.somenteConferencia || config.abrirRevisao !== true) return "LEITURA_PREENCHIDA";

  var avancar = Array.from(document.querySelectorAll("button")).filter(function (el) {
    return visible(el) && !el.disabled && el.textContent.trim() === "Avançar";
  });
  if (avancar.length !== 1) return "AVANCO_NAO_CONFIRMADO";
  if (!window.__andradeAutoleituraAvancou) {
    window.__andradeAutoleituraAvancou = true;
    avancar[0].click();
  }
  return "AGUARDANDO_CONFIRMACAO";
})(__ANDRADE_CONFIG__);
