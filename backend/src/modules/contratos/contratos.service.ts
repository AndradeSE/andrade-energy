import {
    atualizarContrato,
    buscarContratoCliente,
    criarContrato,
    excluirContrato,
} from "./contratos.repository";

export async function obterContratoCliente(
  clienteId: string
) {
  return await buscarContratoCliente(clienteId);
}

export async function criarContratoService(
  dados: any
) {
  return await criarContrato(dados);
}

export async function atualizarContratoService(
  id: string,
  dados: any
) {
  return await atualizarContrato(id, dados);
}

export async function excluirContratoService(
  id: string
) {
  await excluirContrato(id);

  return {
    sucesso: true,
  };
}
