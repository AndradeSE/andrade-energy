const inicioEndereco =
  "RUA|AVENIDA|AV\\.?|RODOVIA|ROD\\.?|ESTRADA|EST\\.?|TRAVESSA|TRAV\\.?|ALAMEDA|PRAÇA|PRACA|FAZENDA|SÍTIO|SITIO|CHÁCARA|CHACARA|ÁREA|AREA|LOTEAMENTO|VILA|ZONA RURAL|POVOADO|COMUNIDADE|VICINAL|BR|MG|B";

export function extrairCadastroCemig(texto: string) {
  const bloco = texto.match(
    new RegExp(
      `([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ .'-]{3,}?)\\s+((?:${inicioEndereco})\\b.*?)\\s+(?:CPF|CNPJ)\\b`,
      "u"
    )
  );

  const cliente = (bloco?.[1] ?? "").trim();
  const endereco = (bloco?.[2] ?? "").replace(/\s+/g, " ").trim();

  const uc = (
    texto.match(
      /(?:N\.?\s*[º°o]?\s*(?:DA UNIDADE CONSUMIDORA|DA INSTALAÇÃO|DA INSTALACAO)|UNIDADE CONSUMIDORA|INSTALAÇÃO|INSTALACAO)\s*[:\-]?\s*([\d.\-]{8,})/i
    )?.[1] ?? ""
  ).replace(/\D/g, "");

  return { cliente, endereco, uc };
}
