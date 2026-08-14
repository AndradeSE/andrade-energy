import { interpretarFatura as interpretarOCR } from "../../services/ocr/parser.service";

import { FaturaExtraida } from "../../types/FaturaExtraida";

export type FaturaInterpretada = FaturaExtraida;

export function interpretarFatura(
  texto: string
): FaturaInterpretada {
  return interpretarOCR(texto);
}