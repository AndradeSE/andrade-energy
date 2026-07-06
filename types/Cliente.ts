export interface Cliente {

  id: string;

  nome: string;

  uc: string;

  telefone: string;

  cpf: string;

  endereco: string;

  cidade: string;

  estado: string;

  distribuidora: string;

  percentual_desconto: number;

  usina_id: string | null;

}