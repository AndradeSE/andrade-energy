import { parseCabecalho } from "../parsers/cabecalho.parser";
import { parseCompensacao } from "../parsers/compensacao.parser";
import { parseDebitos } from "../parsers/debitos.parser";
import { parseHistorico } from "../parsers/historico.parser";
import { parseTarifa } from "../parsers/tarifa.parser";

export interface FaturaInterpretada {

  distribuidora: string;

  cliente: string;

  uc: string;

  competencia: string;

  vencimento: string;

  valorTotal: number;

  consumoKwh: number;

  historico: any[];

  debitos: any[];

  tarifaEnergia: number;

  bandeira: string;

}

export function interpretarFatura(
  texto: string
): FaturaInterpretada {

  const compensacao =
  parseCompensacao(texto);

  const tarifa =
    parseTarifa(texto);

  const historico = parseHistorico(texto);

const debitos = parseDebitos(texto);

  const cabecalho =
    parseCabecalho(texto);


  return {

  distribuidora: "CEMIG",

  ...cabecalho,

  historico,

  debitos,

  ...tarifa,

  ...compensacao,

  bandeira: ""

};

}