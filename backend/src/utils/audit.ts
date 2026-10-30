import { supabase } from "../config/supabase";

export async function auditar(input: { empresaId: string; usuarioId?: string | null; acao: string; recurso: string; recursoId?: string | null; detalhes?: Record<string, unknown> }) {
  const { error } = await supabase.from("auditoria_seguranca").insert({
    empresa_id: input.empresaId, usuario_id: input.usuarioId ?? null, acao: input.acao,
    recurso: input.recurso, recurso_id: input.recursoId ?? null, detalhes: input.detalhes ?? {},
  });
  if (error) console.error("[auditoria] falha ao registrar evento", { acao: input.acao, recurso: input.recurso, motivo: error.message });
}
