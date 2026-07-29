export interface HistoricoConsumo {
  mes: string;
  consumo: number;
}

export interface DebitoPendente {
  competencia: string;
  valor: number;
  previsaoCorte?: string;
}

export interface FaturaCemig {
  distribuidora: string;
  cliente: string;
  uc: string;
  competencia: string;
  vencimento: string;
  valorTotal: number;
  consumo: number;
  tarifaEnergia: number;
  bandeira: string;
  historico: HistoricoConsumo[];
  debitos: DebitoPendente[];
}