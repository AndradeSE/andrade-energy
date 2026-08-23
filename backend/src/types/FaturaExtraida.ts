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

  /** Crédito efetivamente abatido na fatura pela energia GD I ou GD II. */
  valorCreditoCompensado?: number;

  valorEnergiaConcessionaria?: number;

  /** Modalidade de ligação lida no quadro cadastral da concessionária. */
  tipoLigacao?: "MONOFASICO" | "BIFASICO" | "TRIFASICO";

  /** Franquia mínima de rede: 30, 50 ou 100 kWh conforme a ligação. */
  franquiaDisponibilidadeKwh?: number;

  /** Tarifa da franquia sem impostos, usada no ajuste da disponibilidade. */
  tarifaDisponibilidadeSemImpostos?: number;

  /** Diferença da disponibilidade: franquia x (tarifa cheia - tarifa unitária). */
  custoDisponibilidade: number;

  /** Valor que aparece inicialmente na NF, antes do ajuste de disponibilidade. */
  custoDisponibilidadeComImpostos?: number;

  /** Ajuste negativo que a CEMIG aplica à franquia já considerada no SCEE. */
  ajusteCustoDisponibilidade?: number;

  /** CIP, multas e demais itens que completam o total da conta. */
  encargosAdicionais?: number;

  bandeira: string;

  historico: HistoricoConsumo[];

  debitos: DebitoExtraido[];
}
