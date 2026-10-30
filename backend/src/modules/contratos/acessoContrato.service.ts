import { supabase } from "../../config/supabase";
import { acessoPorUnidade } from "./acessoContrato.policy";
import { restaurarContratoAssinadoDaMesmaUc } from "./contratos.repository";
export { contratoLiberaUnidade } from "./acessoContrato.policy";

export async function listarAcessoContratos(usuario: any) {
  if (!usuario.cliente_id) return [];
  const { data: unidades, error } = await supabase.from("unidades_consumidoras").select("id,numero,apelido,cliente_id")
    .eq("cliente_id", usuario.cliente_id).eq("empresa_id", usuario.empresa_id);
  if (error) throw error;
  for (const unidade of unidades ?? []) {
    await restaurarContratoAssinadoDaMesmaUc(
      usuario.cliente_id,
      unidade.id,
      unidade.numero,
      usuario.empresa_id,
    );
  }
  const { data: contratos, error: erro } = await supabase.from("contratos").select("*")
    .eq("cliente_id", usuario.cliente_id).order("created_at", { ascending: false });
  if (erro) throw erro;
  return acessoPorUnidade(unidades ?? [], contratos ?? []);
}
