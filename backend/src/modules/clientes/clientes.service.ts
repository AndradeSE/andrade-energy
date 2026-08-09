console.log("CLIENTES SERVICE CARREGADO");
import {
  atualizarCliente,
  buscarCliente,
  buscarClientePorUC,
  criarCliente,
  excluirCliente,
  listarClientes,
} from "./clientes.repository";

export {
  atualizarCliente, buscarCliente,
  buscarClientePorUC,
  criarCliente, excluirCliente, listarClientes
};

export async function cadastrarClienteAutomaticamente(dados: {
  nome: string;
  uc: string;
  distribuidora: string;
}) {
  return criarCliente({
    nome: dados.nome,
    uc: dados.uc,
    numero_instalacao: dados.uc,
    distribuidora: dados.distribuidora,
    status: "ATIVO",
  });
}