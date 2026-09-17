import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { supabase } from "../../config/supabase";
import { empresaIdDoUsuario } from "../../config/empresa";

const router = Router();
router.get("/", exigirAutenticacao, async (req, res) => {
  try {
    const usuario = (req as any).usuario;
    const { data, error } = await supabase.from("notificacoes_app")
      .select("id,tipo,titulo,detalhe,rota,criado_em")
      .eq("usuario_id", usuario.id).eq("empresa_id", empresaIdDoUsuario(usuario))
      .order("criado_em", { ascending: false }).limit(30);
    if (error) throw error;
    res.json(data ?? []);
  } catch (erro: any) { res.status(500).json({ message: erro.message }); }
});
export default router;
