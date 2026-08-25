import { Router } from "express";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { atualizarCarteira, resumoCarteira, transferirCarteira } from "./carteira.service";

const router = Router();
router.use(exigirAutenticacao, exigirGestor);
router.get("/", async (req, res) => { try { return res.json(await resumoCarteira((req as any).usuario)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.put("/", async (req, res) => { try { return res.json(await atualizarCarteira((req as any).usuario, req.body)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/transferencias", async (req, res) => { try { return res.json(await transferirCarteira((req as any).usuario, req.body)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
export default router;

