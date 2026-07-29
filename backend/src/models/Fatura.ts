import { Debito } from "./Debito";
import { Historico } from "./Historico";

export interface Fatura {

  distribuidora: string;

  cliente: string;

  uc: string;

  competencia: string;

  vencimento: string;

  valorTotal: number;

  consumoKwh: number;

  tarifaEnergia: number;

  icms: number;

  pis: number;

  cofins: number;

  energiaCompensadaKwh: number;

  energiaInjetadaKwh: number;

  saldoAnteriorKwh: number;

  saldoAtualKwh: number;

  creditosUtilizadosKwh: number;

  bandeira: string;

  historico: Historico[];

  debitos: Debito[];

}