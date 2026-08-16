import {
  atualizarCliente,
  buscarCliente,
  buscarClientePorUC,
  cadastrarUnidadeCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
  listarUnidadesCliente,
  listarUnidadesPorCpf,
} from "./clientes.repository";

export {
  atualizarCliente, buscarCliente,
  buscarClientePorUC,
  cadastrarUnidadeCliente,
  criarCliente, excluirCliente, listarClientes, listarUnidadesCliente, listarUnidadesPorCpf
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
