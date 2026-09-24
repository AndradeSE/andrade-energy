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
      .select("id,tipo,titulo,detalhe,rota,criado_em")
      .eq("usuario_id", usuario.id).eq("empresa_id", empresaIdDoUsuario(usuario))
      .order("criado_em", { ascending: false }).limit(30);
    if (error) throw error;
    res.json(data ?? []);
  } catch { res.status(500).json({ message: "Não foi possível carregar as notificações." }); }
});
export default router;
