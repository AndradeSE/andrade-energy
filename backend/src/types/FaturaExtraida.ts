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

  /** Documento extraído do cabeçalho da conta da concessionária, quando houver. */
  cpf?: string;

  endereco: string;

  uc: string;

  distribuidora: string;

  referencia: string;

  vencimento: string;

  consumo: number;

  energiaInjetada: number;

  leituraAnterior?: number;

  leituraAtual?: number;

  fatorMultiplicacao?: number;

  energiaCompensada: number;

  energiaCompensadaGD1?: number;

  energiaCompensadaGD2?: number;

  saldoAnterior: number;

  saldoAtual: number;

  valorTotal: number;

  economia: number;

  tarifaCheia: number;

  tarifaGD: number;

  tarifaGD1?: number;

  tarifaGD2?: number;

  tarifaScee?: number;

  valorEnergiaConcessionaria?: number;

  custoDisponibilidade: number;

  bandeira: string;

  historico: HistoricoConsumo[];

  debitos: DebitoExtraido[];
}
