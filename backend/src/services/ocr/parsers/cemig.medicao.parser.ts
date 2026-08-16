function paraNumeroMedicao(valor: string) {
  const limpo = valor.trim();
  if (!limpo) return undefined;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

export interface MedicaoExtraida {
  leituraAnterior?: number;
  leituraAtual?: number;
  fatorMultiplicacao: number;
}

export function extrairMedicaoCemig(texto: string): MedicaoExtraida {
  const trecho = texto.match(/(?:LEITURA|DADOS DA MEDI[CÇ][AÃ]O).{0,700}/i)?.[0] ?? texto;
  const anterior = trecho.match(/LEITURA ANTERIOR\s*[:\-]?\s*([\d.,]+)/i)?.[1];
  const atual = trecho.match(/LEITURA ATUAL\s*[:\-]?\s*([\d.,]+)/i)?.[1];
  const fator = trecho.match(/(?:FATOR|CONSTANTE)(?: DE)? MULTIPLICA[CÇ][AÃ]O\s*[:\-]?\s*([\d.,]+)/i)?.[1];

  if (anterior && atual) return {
    leituraAnterior: paraNumeroMedicao(anterior),
    leituraAtual: paraNumeroMedicao(atual),
    fatorMultiplicacao: paraNumeroMedicao(fator ?? "1") ?? 1,
  };

  // Formato extraído dos PDFs atuais da CEMIG, que concatena toda a linha:
  // Energia kWh + medidor + leitura anterior + leitura atual + fator + consumo.
  const linhaCemig = trecho.match(/Energia kWh[A-Z]{2,4}\d{9}(\d{1,3}(?:\.\d{3})+)(\d{1,3}(?:\.\d{3})+)(\d+)/i);
  if (linhaCemig) {
    const leituraAnterior = paraNumeroMedicao(linhaCemig[1]);
    const leituraAtual = paraNumeroMedicao(linhaCemig[2]);
    const cauda = linhaCemig[3];
    let fatorMultiplicacao = 1;
    if (leituraAnterior !== undefined && leituraAtual !== undefined) {
      const diferenca = leituraAtual - leituraAnterior;
      for (let tamanho = 1; tamanho < cauda.length; tamanho += 1) {
        const fatorCandidato = Number(cauda.slice(0, tamanho));
        const consumoInformado = Number(cauda.slice(tamanho));
        if (fatorCandidato > 0 && Math.abs(diferenca * fatorCandidato - consumoInformado) < 1) {
          fatorMultiplicacao = fatorCandidato;
          break;
        }
      }
    }
    return { leituraAnterior, leituraAtual, fatorMultiplicacao };
  }

  const tabela = trecho.match(/(?:N[ÚU]MERO|N[º°])(?: DO)? MEDIDOR.*?LEITURA ANTERIOR.*?LEITURA ATUAL.*?(?:FATOR|CONSTANTE)(?: DE)? MULTIPLICA[CÇ][AÃ]O.*?\b\d{5,}\b\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i);
  return {
    leituraAnterior: paraNumeroMedicao(tabela?.[1] ?? ""),
    leituraAtual: paraNumeroMedicao(tabela?.[2] ?? ""),
    fatorMultiplicacao: paraNumeroMedicao(tabela?.[3] ?? "1") ?? 1,
  };
}
