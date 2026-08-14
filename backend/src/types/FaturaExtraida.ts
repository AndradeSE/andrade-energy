export interface HistoricoConsumo {
  mes: string;
  consumo: number;
  mediaDiaria: number;
  dias: number;
}

export interface DebitoExtraido {
  referencia: string;
  vencimento: string;
  valor: number;
}

export interface FaturaExtraida {
  cliente: string;

  uc: string;

  distribuidora: string;

  referencia: string;

  vencimento: string;

  consumo: number;

  energiaInjetada: number;

  energiaCompensada: number;

  saldoAnterior: number;

  saldoAtual: number;

  valorTotal: number;

  economia: number;

  tarifaCheia: number;

  tarifaGD: number;

  custoDisponibilidade: number;

  bandeira: string;

  historico: HistoricoConsumo[];

  debitos: DebitoExtraido[];
}