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

  const ucComRotulo = texto.match(
    /(?:N\.?\s*[º°o]?\s*(?:DA UNIDADE CONSUMIDORA|DA INSTALAÇÃO|DA INSTALACAO)|UNIDADE CONSUMIDORA|INSTALAÇÃO|INSTALACAO)\s*[:\-]?\s*([\d.\-]{8,})/i
  )?.[1];

  // Em algumas faturas CEMIG a UC é exibida isoladamente no cabeçalho, sem
  // rótulo. O formato com grupos e hífen evita confundi-la com CNPJ, código de
  // barras ou número de nota fiscal.
  const ucIsolada = texto.match(/(?:^|\r?\n)\s*(\d{1,2}\.\d{3}\.\d{3}\.\d{3}-\d{2})\s*(?=\r?\n|$)/m)?.[1];
  const uc = (ucComRotulo ?? ucIsolada ?? "").replace(/\D/g, "");

  // A conta CEMIG pode trazer o CPF completo, mascarado ou somente quatro
  // dígitos. Mantemos o trecho parcial separado: ele é suficiente para
  // conferir a identidade durante o onboarding, sem fingir que é um CPF
  // completo nos demais fluxos da aplicação.
  const documentoInformado = (
    texto.match(/(?:CPF\s*(?:\/\s*CNPJ)?|CNPJ)\s*[:\-]?\s*([*Xx\d.\-/]{4,20})/i)?.[1] ?? ""
  ).replace(/\D/g, "");
  // Mantém CNPJ completo por compatibilidade com os fluxos já existentes de
  // importação; a validação do onboarding somente aceita CPF de 11 dígitos.
  const cpf = documentoInformado.length >= 11 ? documentoInformado : "";
  const cpfParcial = documentoInformado.length > 0 && documentoInformado.length < 11
    ? documentoInformado
    : "";

  const tensao = (
    texto.match(/TENS[AÃ]O(?:\s+(?:NOMINAL|FORNECIDA|DE\s+FORNECIMENTO))?(?:\s*\([^)]+\))?\s*[:\-]?\s*(\d{2,3}(?:\s*\/\s*\d{2,3})?\s*V?)/i)?.[1] ?? ""
  ).replace(/\s+/g, " ").trim();
  const classificacao = (
    texto.match(/CLASSIFICA[CÇ][AÃ]O(?:\s+TARIF[AÁ]RIA)?\s*[:\-]?\s*([^\r\n]{2,48})/i)?.[1]
      ?? texto.match(/\b(B[1-4]\s+(?:RESIDENCIAL|COMERCIAL|RURAL|INDUSTRIAL)[^\r\n]{0,28})/i)?.[1]
      ?? texto.match(/\b((?:RESIDENCIAL|COMERCIAL|RURAL|INDUSTRIAL)(?:\s*(?:RESIDENCIAL|COMERCIAL|RURAL|INDUSTRIAL))?\s+(?:CONVENCIONAL\s+)?B[1-4])/i)?.[1]
      ?? ""
  ).replace(/^(Residencial|Comercial|Rural|Industrial)\1/i, "$1 ").replace(/\s+/g, " ").trim();

  return { cliente, endereco, uc, cpf, cpfParcial, tensao, classificacao };
}
