import { Router } from "express";
import { exigirAutenticacao, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import * as controller from "./comercial.controller";

const router = Router();
router.get("/minha-assinatura", exigirAutenticacao, controller.minhaAssinatura);
router.post("/minha-assinatura/checkout", exigirAutenticacao, controller.checkoutMinhaAssinatura);
router.use(exigirAutenticacao, exigirSuperAdministradorAndrade);
router.get("/painel", controller.painel);
router.post("/planos", controller.criarPlano);
router.put("/planos/:id", controller.atualizarPlano);
router.post("/assinaturas", controller.contratar);
router.patch("/assinaturas/:id/status", controller.status);
router.post("/assinaturas/:id/cobrancas", controller.cobrar);
router.get("/assinaturas/:id/cobrancas", controller.cobrancas);
export default router;
