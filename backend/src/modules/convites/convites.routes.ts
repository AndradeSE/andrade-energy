import { Router } from "express";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { consultarConviteController, criarConviteController } from "./convites.controller";

const router = Router();
router.get("/:token", consultarConviteController);
router.post("/", exigirAutenticacao, exigirGestor, criarConviteController);
export default router;
