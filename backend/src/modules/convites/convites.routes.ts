import { Router } from "express";
import { exigirAdministrador, exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { consultarConviteController, consultarConviteGeradorController, criarConviteController, criarConviteGeradorController, reenviarConviteUnidadeController, solicitarReenvioConviteController } from "./convites.controller";

const router = Router();
router.get("/geradores/:token", consultarConviteGeradorController);
router.post("/geradores", exigirAutenticacao, exigirAdministrador, criarConviteGeradorController);
router.post("/solicitar-reenvio", solicitarReenvioConviteController);
router.post("/unidades/:unidadeId/reenviar", exigirAutenticacao, exigirGestor, reenviarConviteUnidadeController);
router.get("/:token", consultarConviteController);
router.post("/", exigirAutenticacao, exigirGestor, criarConviteController);
export default router;
