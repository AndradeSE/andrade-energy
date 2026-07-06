export interface Fatura {

  id: string;

  cliente_id: string;

  referencia: string;

  numero_instalacao: string;

  valor_total: number;

  economia: number;

  vencimento: string;

  consumo_kwh: number;

  arquivo_url: string;

}