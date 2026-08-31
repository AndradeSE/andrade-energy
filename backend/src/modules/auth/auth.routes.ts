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
  testeGeradorController,
  verificarEmailDeCadastroController,
} from "./auth.controller";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";

const router = Router();

router.post("/cadastro", cadastroController);
router.post("/cadastro-consumidor", upload.single("fatura"), cadastroConsumidorController);
router.post("/verificar-email", verificarEmailDeCadastroController);
router.post("/reenviar-verificacao-email", reenviarVerificacaoDeCadastroController);
router.post("/teste-gerador", testeGeradorController);

router.post(
  "/login",
  loginController
);

router.get("/me", exigirAutenticacao, meuPerfilController);
router.put("/me", exigirAutenticacao, atualizarMeuPerfilController);
router.post("/me/senha", exigirAutenticacao, alterarMinhaSenhaController);
router.delete("/me", exigirAutenticacao, excluirMinhaContaController);

export default router;
