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

  referencia: string;

  vencimento: string;

  valorTotal: number;

  consumo: number;

  energiaInjetada: number;

  leituraAnterior?: number;

  leituraAtual?: number;

  fatorMultiplicacao?: number;

  energiaCompensada: number;

  saldoAnterior: number;

  saldoAtual: number;

  economia: number;

  tarifaCheia: number;

  tarifaGD: number;

  custoDisponibilidade: number;

  bandeira: string;

  distribuidora: string;

  historico: HistoricoConsumo[];

  debitos: DebitoExtraido[];
}
