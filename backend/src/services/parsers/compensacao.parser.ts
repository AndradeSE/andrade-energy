export interface CompensacaoEnergia {

  energiaCompensadaKwh: number;

  energiaInjetadaKwh: number;

  saldoAnteriorKwh: number;

  saldoAtualKwh: number;

  creditosUtilizadosKwh: number;

}

export function parseCompensacao(
  texto: string
): CompensacaoEnergia {

  const numero = (regex: RegExp) => {

    const match = texto.match(regex);

    if (!match) return 0;

    return Number(
      match[1]
        .replace(/\./g, "")
        .replace(",", ".")
    );

  };

  return {

    energiaCompensadaKwh: numero(
      /Energia Compensada.*?([\d,.]+)/i
    ),

    energiaInjetadaKwh: numero(
      /Energia Injetada.*?([\d,.]+)/i
    ),

    saldoAnteriorKwh: numero(
      /Saldo Anterior.*?([\d,.]+)/i
    ),

    saldoAtualKwh: numero(
      /Saldo Atual.*?([\d,.]+)/i
    ),

    creditosUtilizadosKwh: numero(
      /Créditos Utilizados.*?([\d,.]+)/i
    )

  };

}