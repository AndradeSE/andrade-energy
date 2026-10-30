import { atualizarStatusGerador, buscarGerador, listarContasGeradoras, removerContaGeradora } from "./usuarios.repository";
import { supabase } from "../../config/supabase";
import { asaasRequest } from "../asaas/asaas.client";

export async function listarGeradores() { return listarContasGeradoras(); }

export async function alterarStatusGerador(id: string, ativo: boolean, administradorId: string) {
  const conta = await buscarGerador(id);
  if (!conta) throw new Error("Conta geradora não encontrada.");
  if (conta.perfil === "ADMIN") throw new Error("A conta administradora não pode ser desativada por esta tela.");
  if (id === administradorId) throw new Error("Você não pode desativar sua própria conta.");
  return atualizarStatusGerador(id, ativo);
}

export async function removerGerador(id: string, administradorId: string) {
  const conta = await buscarGerador(id);
  if (!conta) throw new Error("Conta geradora não encontrada.");
  if (conta.perfil === "ADMIN") throw new Error("A conta administradora não pode ser removida.");
  if (id === administradorId) throw new Error("Você não pode remover sua própria conta.");

  const { data: assinaturas, error } = await supabase
    .from("assinaturas_geradores")
    .select("asaas_subscription_id")
    .eq("gerador_id", id)
    .not("asaas_subscription_id", "is", null);
  if (error) throw error;
  for (const assinatura of assinaturas ?? []) {
    if (assinatura.asaas_subscription_id) {
      // O encerramento local não pode ficar bloqueado por uma assinatura que já
      // tenha sido removida ou esteja temporariamente indisponível no Asaas.
      await asaasRequest(`/subscriptions/${assinatura.asaas_subscription_id}`, { method: "DELETE" }).catch(() => null);
    }
  }
  return removerContaGeradora(id);
}
