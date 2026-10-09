import { Router } from "express";

import {
  alterarMinhaSenhaController,
  atualizarMeuPerfilController,
  cadastroController,
  cadastroConsumidorController,
  excluirMinhaContaController,
  loginController,
  meuPerfilController,
  reenviarVerificacaoDeCadastroController,
  redefinirSenhaController,
  solicitarRecuperacaoSenhaController,
  testeGeradorController,
  verificarEmailDeCadastroController,
} from "./auth.controller";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";
import { supabase } from "../../config/supabase";
import { publicSessionUser, revokeAuthenticatedSession } from "./session";

const router = Router();

router.post("/cadastro", cadastroController);
router.post("/cadastro-consumidor", upload.single("fatura"), cadastroConsumidorController);
router.post("/verificar-email", verificarEmailDeCadastroController);
router.post("/reenviar-verificacao-email", reenviarVerificacaoDeCadastroController);
router.post("/solicitar-recuperacao-senha", solicitarRecuperacaoSenhaController);
router.post("/redefinir-senha", redefinirSenhaController);
router.post("/teste-gerador", testeGeradorController);

router.post(
  "/login",
  loginController
);

router.get("/me", exigirAutenticacao, meuPerfilController);
router.get("/session", exigirAutenticacao, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json({ usuario: publicSessionUser((req as any).usuario) });
});
router.post("/logout", exigirAutenticacao, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await revokeAuthenticatedSession(supabase, (req as any).sessaoId, (req as any).usuario.id);
    return res.json({ message: "Sessão encerrada." });
  } catch { return res.status(503).json({ message: "Não foi possível encerrar a sessão." }); }
});
router.put("/me", exigirAutenticacao, atualizarMeuPerfilController);
router.post("/me/senha", exigirAutenticacao, alterarMinhaSenhaController);
router.delete("/me", exigirAutenticacao, excluirMinhaContaController);

export default router;
