export interface FaturaExtraida {
  cliente: string;
  uc: string;
  distribuidora: string;
  referencia: string;
  vencimento: string;
  consumo: number;
  energiaInjetada: number;
  valorTotal: number;
  economia: number;
  bandeira: string;
}