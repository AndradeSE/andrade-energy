export interface DebitoPendente {

  competencia: string;

  valor: number;

  previsaoCorte: string;

}

export function parseDebitos(
  texto: string
): DebitoPendente[] {

  const debitos: DebitoPendente[] = [];

  const regex =
    /(\d{2}\/\d{4})\s*([\d,.]+)\s*(\d{2}\/\d{2}\/\d{4})/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto)) !== null) {

    debitos.push({

      competencia: match[1],

      valor: Number(
        match[2]
          .replace(/\./g, "")
          .replace(",", ".")
      ),

      previsaoCorte: match[3]

    });

  }

  return debitos;

}