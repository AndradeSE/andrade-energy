import { FaturaExtraida } from "./FaturaExtraida";

export interface ImportacaoFatura {
  pdfUrl: string;
  dados: FaturaExtraida;
}