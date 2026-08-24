import { Router } from "express";
import { exigirAdministrador, exigirAutenticacao } from "../../middlewares/auth.middleware";
import { alterarStatusGeradorController, listarGeradoresController } from "./usuarios.controller";

const router = Router();
router.use(exigirAutenticacao, exigirAdministrador);
router.get("/geradores", listarGeradoresController);
router.patch("/geradores/:id/status", alterarStatusGeradorController);
export default router;
