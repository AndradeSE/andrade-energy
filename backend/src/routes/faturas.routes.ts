import { Router } from "express";
import multer from "multer";
import {
  buscarFaturaController,
  listarFaturasController,
  processarFaturaController
} from "../controllers/faturas.controller";


console.log("FATURAS ROUTES CARREGADAS");


const router = Router();

router.get("/processar", (_, res) => {
  res.json({ mensagem: "GET funcionando" });
});


const upload = multer({
  dest: "src/uploads"
});

router.get(
  "/:id",
  buscarFaturaController
);

router.get(
  "/cliente/:clienteId",
  listarFaturasController,
);
router.post(
  "/processar",
  upload.single("pdf"),
  processarFaturaController
);

export default router;