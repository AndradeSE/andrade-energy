import { atualizarStatusGerador, buscarGerador, listarContasGeradoras } from "./usuarios.repository";

export async function listarGeradores() { return listarContasGeradoras(); }

export async function alterarStatusGerador(id: string, ativo: boolean, administradorId: string) {
  const conta = await buscarGerador(id);
  if (!conta) throw new Error("Conta geradora não encontrada.");
  if (conta.perfil === "ADMIN") throw new Error("A conta administradora não pode ser desativada por esta tela.");
  if (id === administradorId) throw new Error("Você não pode desativar sua própria conta.");
  return atualizarStatusGerador(id, ativo);
}
