import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { supabase } from "../../config/supabase";
import { empresaIdDoUsuario } from "../../config/empresa";

const router = Router();
router.post("/push-token", exigirAutenticacao, async (req, res) => {
  try {
    const usuario = (req as any).usuario;
    const token = String(req.body?.token ?? "").trim();
    if (!/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token)) {
      return res.status(400).json({ message: "Token de notificação inválido." });
    }
    const agora = new Date().toISOString();
    const { error } = await supabase.from("dispositivos_push").upsert({
      usuario_id: usuario.id,
      empresa_id: empresaIdDoUsuario(usuario),
      token,
      plataforma: String(req.body?.plataforma ?? "android"),
      app_variante: String(req.body?.appVariante ?? ""),
      ativo: true,
      atualizado_em: agora,
    }, { onConflict: "token" });
    if (error) throw error;
    return res.json({ registrado: true });
  } catch { return res.status(500).json({ message: "Não foi possível registrar este dispositivo." }); }
});
router.get("/", exigirAutenticacao, async (req, res) => {
  try {
    const usuario = (req as any).usuario;
    const { data, error } = await supabase.from("notificacoes_app")
      .select("id,tipo,titulo,detalhe,rota,criado_em,chave_dedupe")
      .eq("usuario_id", usuario.id).eq("empresa_id", empresaIdDoUsuario(usuario))
      .order("criado_em", { ascending: false }).limit(30);
    if (error) throw error;
    // Avisos anteriores enviavam apenas /contrato. Recupere a UC do
    // contrato registrado na deduplicação, nunca da seleção do aparelho.
    const antigos = (data ?? []).filter(item => item.rota === "/contrato"
      && ["CONTRATO_DISPONIVEL", "REVISAO_CONTRATUAL_DISPONIVEL"].includes(item.tipo));
    const ids = [...new Set(antigos.map(item => /^contrato-enviado:([0-9a-f-]{36}):/i.exec(item.chave_dedupe ?? "")?.[1]).filter(Boolean))];
    const destinos = new Map<string, string>();
    if (ids.length && usuario.cliente_id) {
      const { data: contratos, error: erroContratos } = await supabase.from("contratos")
        .select("id,unidade_consumidora_id")
        .in("id", ids).eq("empresa_id", empresaIdDoUsuario(usuario)).eq("cliente_id", usuario.cliente_id);
      if (erroContratos) throw erroContratos;
      for (const contrato of contratos ?? []) {
        if (contrato.unidade_consumidora_id) destinos.set(contrato.id, contrato.unidade_consumidora_id);
      }
    }
    res.json((data ?? []).map(({ chave_dedupe, ...item }) => {
      const contratoId = /^contrato-enviado:([0-9a-f-]{36}):/i.exec(chave_dedupe ?? "")?.[1];
      const unidadeId = contratoId ? destinos.get(contratoId) : undefined;
      return unidadeId && item.rota === "/contrato"
        ? { ...item, rota: `/contrato?unidadeId=${encodeURIComponent(unidadeId)}` } : item;
    }));
  } catch { res.status(500).json({ message: "Não foi possível carregar as notificações." }); }
});
export default router;
