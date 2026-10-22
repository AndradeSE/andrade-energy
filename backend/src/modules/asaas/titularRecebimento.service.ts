import { supabase } from "../../config/supabase";
import { asaasRequest } from "./asaas.client";
import { exigirMesmoTitularRecebimento } from "./titularRecebimento.policy";

export async function exigirTitularDaCarteira(carteira: any) {
  if (!carteira?.usuario_id || !carteira?.empresa_id || carteira.status !== "ATIVA") {
    throw new Error("Cobrança bloqueada: configure a conta de recebimento do gerador.");
  }
  const { data: titular, error } = await supabase.from("usuarios").select("cpf,empresa_id,ativo")
    .eq("id", carteira.usuario_id).eq("empresa_id", carteira.empresa_id).maybeSingle();
  if (error || !titular?.ativo) throw new Error("Não foi possível validar o titular do recebimento.");
  const conta = await asaasRequest<any>("/myAccount/commercialInfo/");
  exigirMesmoTitularRecebimento(conta?.cpfCnpj, titular.cpf);
}

export async function exigirRecebimentoDaUsina(carteira: any, usinaId: unknown) {
  // Não aceita a escolha arbitrária de um ADM da empresa como recebedor.
  if (!usinaId || carteira?.usina_id !== usinaId) {
    throw new Error("Cobrança bloqueada: vincule a conta de recebimento ao gerador desta usina.");
  }
  if (carteira?.asaas_wallet_id) {
    throw new Error("Cobrança bloqueada: a carteira de destino precisa de validação individual antes de emitir cobranças.");
  }
  await exigirTitularDaCarteira(carteira);
}
