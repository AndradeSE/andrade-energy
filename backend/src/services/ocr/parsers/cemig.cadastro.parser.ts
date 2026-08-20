const inicioEndereco =
  "RUA|AVENIDA|AV\\.?|RODOVIA|ROD\\.?|ESTRADA|EST\\.?|TRAVESSA|TRAV\\.?|ALAMEDA|PRAÇA|PRACA|FAZENDA|SÍTIO|SITIO|CHÁCARA|CHACARA|ÁREA|AREA|LOTEAMENTO|VILA|ZONA RURAL|POVOADO|COMUNIDADE|VICINAL|BR|MG|B";

function nomeExtraidoValido(valor: string) {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!normalizado) return false;

  return ![
    "DEBITO AUTOMATICO",
    "PAGAMENTO",
    "VALOR A PAGAR",
    "VENCIMENTO",
  ].some((rotulo) => normalizado.includes(rotulo));
}

export function extrairCadastroCemig(texto: string) {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.replace(/\s+/g, " ").trim()).filter(Boolean);
  const indiceDocumento = linhas.findIndex((linha) => /^(?:CPF|CNPJ)\b/i.test(linha));
  let clientePorLinhas = "";
  let enderecoPorLinhas = "";

  if (indiceDocumento >= 3) {
    const indiceCidade = indiceDocumento - 1;
    const inicioBusca = Math.max(0, indiceCidade - 4);
    let indiceEndereco = -1;
    for (let indice = inicioBusca + 1; indice < indiceCidade; indice += 1) {
      if (/\d/.test(linhas[indice]) || new RegExp(`^(?:${inicioEndereco})\\b`, "iu").test(linhas[indice])) {
        indiceEndereco = indice;
        break;
      }
    }
    if (indiceEndereco > inicioBusca) {
      const candidato = linhas[indiceEndereco - 1];
      if (nomeExtraidoValido(candidato)) clientePorLinhas = candidato;
      enderecoPorLinhas = linhas.slice(indiceEndereco, indiceDocumento).join(" ");
    }
  }

  const bloco = texto.match(
    new RegExp(
      `([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ .'-]{3,}?)\\s+((?:${inicioEndereco})\\b.*?)\\s+(?:CPF|CNPJ)\\b`,
      "u"
    )
  );

  const clienteExtraido = (bloco?.[1] ?? "").replace(/\s+/g, " ").trim();
  const cliente = clientePorLinhas || (nomeExtraidoValido(clienteExtraido) ? clienteExtraido : "");
  const endereco = enderecoPorLinhas || (bloco?.[2] ?? "").replace(/\s+/g, " ").trim();

  const uc = (
    texto.match(
      /(?:N\.?\s*[º°o]?\s*(?:DA UNIDADE CONSUMIDORA|DA INSTALAÇÃO|DA INSTALACAO)|UNIDADE CONSUMIDORA|INSTALAÇÃO|INSTALACAO)\s*[:\-]?\s*([\d.\-]{8,})/i
    )?.[1] ?? ""
  ).replace(/\D/g, "");

  const cpf = (
    texto.match(/(?:CPF\s*(?:\/\s*CNPJ)?|CNPJ)\s*[:\-]?\s*([\d.\-/]{11,20})/i)?.[1] ?? ""
  ).replace(/\D/g, "");

  return { cliente, endereco, uc, cpf };
}
