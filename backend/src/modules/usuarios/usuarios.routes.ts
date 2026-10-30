import { Router } from "express";
import { exigirAutenticacao, exigirPermissaoComercial, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import { alterarStatusGeradorController, listarGeradoresController, removerGeradorController } from "./usuarios.controller";

const router = Router();
router.use(exigirAutenticacao);
router.get("/geradores", exigirPermissaoComercial("geradores"), listarGeradoresController);
router.patch("/geradores/:id/status", exigirSuperAdministradorAndrade, alterarStatusGeradorController);
router.delete("/geradores/:id", exigirSuperAdministradorAndrade, removerGeradorController);
export default router;
