export interface HistoricoConsumo {
  mes: string;
  consumo: number;
  mediaDiaria: number;
  dias: number;
}

export function parseHistorico(
  texto: string
): HistoricoConsumo[] {

  const historico: HistoricoConsumo[] = [];

  const regex =
    /^([A-Z]{3}\/\d{2})\s+(\d+)\s+([\d,]+)\s+(\d+)$/gm;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto)) !== null) {

    historico.push({

      mes: match[1],

      consumo: Number(match[2]),

      mediaDiaria: Number(
        match[3].replace(",", ".")
      ),

      dias: Number(match[4])

    });

  }

  return historico;

}