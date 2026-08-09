import {
  buscarDashboardUsina,
  buscarUsina,
  criarUsina,
  editarUsina,
  excluirUsina,
  listarUsinas,
} from "./usinas.repository";

export async function listarUsinasService() {
  return await listarUsinas();
}

export async function buscarUsinaService(id: string) {
  const usina = await buscarUsina(id);

  if (!usina) {
    throw new Error("Usina não encontrada.");
  }

  return usina;
}

export async function criarUsinaService(dados: any) {
  return await criarUsina(dados);
}

export async function atualizarUsinaService(
  id: string,
  dados: any
) {
  return await editarUsina(id, dados);
}

export async function excluirUsinaService(id: string) {
  await excluirUsina(id);

  return {
    sucesso: true,
  };
}

export async function obterDashboardUsina(id: string) {
  const dashboard = await buscarDashboardUsina(id);

  return dashboard;
}