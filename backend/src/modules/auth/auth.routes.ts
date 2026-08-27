import { Router } from "express";

import {
  alterarMinhaSenhaController,
  atualizarMeuPerfilController,
  cadastroController,
  excluirMinhaContaController,
  loginController,
  meuPerfilController,
  testeGeradorController,
} from "./auth.controller";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/cadastro", cadastroController);
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
