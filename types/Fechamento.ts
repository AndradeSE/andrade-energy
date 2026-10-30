export interface Fechamento {

  id: string;

  usina_id: string;

  competencia: string;

  energia_gerada: number;

  energia_alocada: number;

  energia_disponivel: number;

  clientes_atendidos: number;

  receita_prevista: number;

  receita_realizada: number;

  ocupacao: number;

  status:
    | "ABERTO"
    | "PROCESSANDO"
    | "FECHADO"
    | "CANCELADO";

  created_at: string;

}