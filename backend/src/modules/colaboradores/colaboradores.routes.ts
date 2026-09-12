import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import * as service from "./colaboradores.service";

const router = Router();
const responder = (res: any, promise: Promise<any>, status = 200) => promise.then((data) => res.status(status).json(data)).catch((error) => res.status(400).json({ message: error.message }));

router.get("/", exigirAutenticacao, (req, res) => responder(res, service.listarColaboradores((req as any).usuario)));
router.post("/convites", exigirAutenticacao, (req, res) => responder(res, service.criarConviteColaborador(req.body, (req as any).usuario), 201));
router.post("/convites/:id/reenviar", exigirAutenticacao, (req, res) => responder(res, service.reenviarConviteColaborador(req.params.id, (req as any).usuario)));
router.delete("/convites/:id", exigirAutenticacao, (req, res) => responder(res, service.cancelarConviteColaborador(req.params.id, (req as any).usuario)));
router.patch("/:id", exigirAutenticacao, (req, res) => responder(res, service.atualizarColaborador(req.params.id, req.body, (req as any).usuario)));

export default router;
