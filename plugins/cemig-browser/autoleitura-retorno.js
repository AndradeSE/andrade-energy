(function (config) {
  if (window !== window.top ||
      !/^https:\/\/(www\.)?atendimento\.cemig\.com\.br$/.test(location.origin) ||
      location.pathname !== "/portal/services/inform-reading") return { estado: "EM_REVISAO" };

  var texto = document.body && document.body.innerText || "";
  var recibo = texto.split(/Sua solicitação foi registrada com sucesso/i);
  if (recibo.length === 1) return { estado: "AGUARDANDO" };
  if (recibo.length !== 2 || !/Tudo certo!/i.test(recibo[0])) return { estado: "EM_REVISAO" };

  var protocolo = recibo[1].match(/(?:^|\n)\s*Protocolo\s+([0-9]{6,30})(?=\s|$)/i);
  var unidade = recibo[1].match(/Número da unidade consumidora\s+([\d.-]+)/i);
  var referencia = recibo[1].match(/Período de referência\s+([\p{L}]+\/\d{4})/iu);
  var data = recibo[1].match(/Data da autorização\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (!protocolo || !unidade || !referencia || !data ||
      unidade[1].replace(/\D/g, "") !== config.uc ||
      referencia[1].toLowerCase() !== config.referencia ||
      data[1] !== config.dataLocal) return { estado: "EM_REVISAO" };

  var estimativa = recibo[1].match(/Valor estimado\s+R\$\s*([\d.]+,\d{2})/i);
  return { estado: "ENVIADA", protocolo: protocolo[1],
    estimativa: estimativa ? Number(estimativa[1].replace(/\./g, "").replace(",", ".")) : null };
})(__ANDRADE_CONFIG__);
