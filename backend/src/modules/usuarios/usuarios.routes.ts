import { Router } from "express";
import { exigirAutenticacao, exigirOperacaoComercial, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import { alterarStatusGeradorController, listarGeradoresController, removerGeradorController } from "./usuarios.controller";

const router = Router();
router.use(exigirAutenticacao);
router.get("/geradores", exigirOperacaoComercial, listarGeradoresController);
router.patch("/geradores/:id/status", exigirOperacaoComercial, alterarStatusGeradorController);
router.delete("/geradores/:id", exigirSuperAdministradorAndrade, removerGeradorController);
export default router;
