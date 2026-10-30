import { FaturaExtraida } from "../backend/src/types/FaturaExtraida";

export interface ImportacaoFatura {
  pdfUrl: string;
  dados: FaturaExtraida;
}