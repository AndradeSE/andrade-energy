import { FaturaExtraida } from "../../../types/FaturaExtraida";
import { buscar } from "../regex";

export function parseCemig(
  texto: string
): FaturaExtraida {

  return {

    cliente: buscar(
      texto,
      /Cliente:(.*)/i
    ),

    uc: buscar(
      texto,
      /Instalação\s*(\d+)/i
    ),

    referencia: buscar(
      texto,
      /Referência\s*(\d{2}\/\d{4})/i
    ),

    vencimento: buscar(
      texto,
      /Vencimento\s*(\d{2}\/\d{2}\/\d{4})/i
    ),

    valorTotal: Number(

      buscar(
        texto,
        /Total\s*a\s*pagar\s*([\d,.]+)/i
      ).replace(".", "").replace(",", ".")

    ),

    consumo: Number(

      buscar(
        texto,
        /Consumo\s*(\d+)/i

      )

    ),

    energiaInjetada: 0,

    economia: 0,

    bandeira: "",

    distribuidora: "CEMIG",

  };

}