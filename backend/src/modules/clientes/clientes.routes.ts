import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  console.log("ENTROU NA ROTA CLIENTES");
  res.json([{ teste: true }]);
});

export default router;