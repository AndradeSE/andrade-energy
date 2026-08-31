function paraNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function ultimoValorDaLinha(linha?: string) {
  if (!linha) return 0;
  const valores = [...linha.matchAll(/-?[\d.]+(?:,\d+)?/g)].map((item) => paraNumero(item[0]));
  const valor = valores.at(-1) ?? 0;
  return Number.isFinite(valor) ? Math.abs(valor) : 0;
}

export function extrairEncargosCemig(texto: string) {
  const linhas = texto.split(/\r?\n/);
  const linhaIluminacao = linhas.find((linha) => /(?:Contrib(?:ui[cç][aã]o)?|Taxa)\s+(?:de\s+)?Ilum(?:ina[cç][aã]o)?\s+P[uú]blica/i.test(linha));
  const iluminacaoCompacta = texto.match(/(?:Contrib(?:ui[cç][aã]o)?|Taxa)\s+(?:de\s+)?Ilum(?:ina[cç][aã]o)?\s+P[uú]blica(?:\s+Municipal)?\s+([\d.,]+)/i)?.[1];
  const linhaBandeira = linhas.find((linha) => /(?:adicional\s+)?bandeira\s+(?:tarif[aá]ria\s+)?(?:verde|amarela|vermelha)/i.test(linha));
  const blocoFiscal = texto.match(/Base\s+de\s+c[aá]lculo[\s\S]{0,800}/i)?.[0] ?? "";
  const linhasFiscais = blocoFiscal.split(/\r?\n/);
  const valorFiscal = (tributo: "ICMS" | "PASEP" | "COFINS") => {
    const porLinha = ultimoValorDaLinha(linhasFiscais.find((linha) => new RegExp(`^\\s*${tributo}\\b`, "i").test(linha)));
    if (porLinha > 0) return porLinha;
    const colunas = blocoFiscal.match(new RegExp(`\\b${tributo}\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)`, "i"));
    return colunas ? paraNumero(colunas[3]) : 0;
  };
  const icms = valorFiscal("ICMS");
  const pasep = valorFiscal("PASEP");
  const cofins = valorFiscal("COFINS");
  return {
    valorIluminacaoPublica: iluminacaoCompacta ? paraNumero(iluminacaoCompacta) : ultimoValorDaLinha(linhaIluminacao),
    valorBandeira: ultimoValorDaLinha(linhaBandeira),
    valorImpostos: icms + pasep + cofins,
  };
}
