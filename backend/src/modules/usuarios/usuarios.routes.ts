import { Router } from "express";
import { exigirAutenticacao, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import { alterarStatusGeradorController, listarGeradoresController } from "./usuarios.controller";

const router = Router();
router.use(exigirAutenticacao, exigirSuperAdministradorAndrade);
router.get("/geradores", listarGeradoresController);
router.patch("/geradores/:id/status", alterarStatusGeradorController);
export default router;
