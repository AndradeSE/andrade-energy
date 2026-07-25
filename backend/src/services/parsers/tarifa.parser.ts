export interface TarifaEnergia {

  tarifaEnergia: number;

  icms: number;

  pis: number;

  cofins: number;

}

export function parseTarifa(
  texto: string
): TarifaEnergia {

  const tarifa =
    texto.match(/Energia ElétricakWh.*?([0-9],[0-9]+)\s*$/m);

  const icms =
    texto.match(/ICMS\s+[\d,]+\s+18,00\s+([\d,]+)/);

  const pis =
    texto.match(/PASEP\s+[\d,]+\s+1,25\s+([\d,]+)/);

  const cofins =
    texto.match(/COFINS\s+[\d,]+\s+5,75\s+([\d,]+)/);

  return {

    tarifaEnergia:
      Number(
        tarifa?.[1]
          .replace(/\./g, "")
          .replace(",", ".")
      ) || 0,

    icms:
      Number(
        icms?.[1]
        .replace(/\./g, "")
        .replace(",", ".")
      ) || 0,

    pis:
      Number(
        pis?.[1]
        .replace(/\./g, "")
        .replace(",", ".")
      ) || 0,

    cofins:
      Number(
        cofins?.[1]
        .replace(/\./g, "")
        .replace(",", ".")
      ) || 0

  };

}