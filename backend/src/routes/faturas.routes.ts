import { Router } from "express";
import multer from "multer";
import { processarFaturaController } from "../controllers/faturas.controller";

const router = Router();

router.get("/processar", (_, res) => {
  res.json({ mensagem: "GET funcionando" });
});


const upload = multer({
  dest: "src/uploads"
});

router.post(
  "/processar",
  upload.single("pdf"),
  processarFaturaController
);

export default router;