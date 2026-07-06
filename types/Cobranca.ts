export interface Cobranca {

  id: string;

  cliente_id: string;

  fatura_id: string;

  referencia: string;

  valor_original: number;

  percentual_desconto: number;

  valor_cobrado: number;

  vencimento: string;

  status: string;

}