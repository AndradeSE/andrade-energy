import {
    atualizarContrato,
    buscarContratoCliente,
    criarContrato,
    excluirContrato,
} from "./contratos.repository";

console.log("========== CONTRATOS SERVICE ==========");
console.log("buscarContratoCliente:", buscarContratoCliente);
console.log("=======================================");

export async function obterContratoCliente(
  clienteId: string
) {
  console.log("obterContratoCliente executado");

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